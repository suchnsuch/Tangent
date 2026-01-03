<script lang="ts">
import { Point } from 'common/geometry'

import { getContext, onMount, tick } from 'svelte'
import { fly } from 'svelte/transition'

import type { Workspace } from 'app/model'

import MapNode, { MapStrength } from 'common/tangentMap/MapNode'
import type MapConnection from 'common/tangentMap/MapConnection'
import { placeMapNodes } from 'common/tangentMap/placeMapNodes'
import MapNodeView from './MapNodeView.svelte'
import MapConnectionView from './MapConnectionView.svelte'

import { CommandAction as command } from 'app/model/commands'
import type { TreeNode } from 'common/trees'
import { appendContextTemplate, type ContextMenuConstructorOptions } from 'app/model/menus';
import { scrollTo } from 'app/utils'
import { clockTime, shortestDayDate } from 'common/dates'
import { startDrag, stopDrag } from 'app/utils/dragging'
import type Session from 'common/dataTypes/Session'
import { readable } from 'svelte/store'
import { markEventAsShortcutable, shortcutFromEvent } from 'app/utils/shortcuts'
import SvgIcon from '../smart-icons/SVGIcon.svelte'
import type { RemoveFromMapCommandContext } from 'app/model/commands/RemoveFromMap'
import type { ThreadHistoryItem, UpdateThreadOptions } from 'common/dataTypes/Session';
import { isMac } from 'common/platform'
import { createCommandHandler } from 'app/model/commands/Command'

const workspace = getContext('workspace') as Workspace

const {
	showPreviousThreadsOnMap,
	showIconsOnMapNodes
} = workspace.settings

const commandHandler = createCommandHandler([
	workspace.commands.removeNodeFromMap,
	workspace.commands.removeNodeAndChildrenFromMap,
	workspace.commands.removeEverythingButNodeFromMap,
	workspace.commands.removeEverythingButThreadFromMap
])

export let session: Session
export let isActive: boolean

export let updateThread: (options: UpdateThreadOptions) => void = null

if (!updateThread) updateThread = session.updateThread.bind(session)

$: map = session.map
$: current = session.currentThread
$: nodesStore = map.nodes
$: connectionsStore = map.connections
$: nodes = [...$nodesStore.values()]

// TODO: Fix this
$: canUndo = readable(false) //tangent.undoStack.canUndo
$: canRedo = readable(false) //tangent.undoStack.canRedo

let connections: ConnectionMeta[] = []
let highlightConnections: ConnectionMeta[] = []
let placedNodes = []

let threadStack: TreeNode[] = []
let threadHistoryStack: ThreadHistoryItem[] = []
$: {
	$showIconsOnMapNodes
	threadStack = $current ? [...$current.thread] : []
	threadHistoryStack = $showPreviousThreadsOnMap ? buildThreadHistory() : []
	triggerRePlace()
}

function* threadToConnections(thread: TreeNode[]) {
	for (let i = 1; i < thread.length; i++) {
		const from = thread[i-1]
		const to = thread[i]
		const connection = map.findConnection(from, to)
		if (connection) {
			yield connection
		}
	}
}

function buildThreadHistory() {

	const result: ThreadHistoryItem[] = []

	const allConnections: Set<MapConnection> = new Set()

	if ($current) {
		for (const connection of threadToConnections($current.thread)) {
			allConnections.add(connection)
		}
	}

	let index = session.threadIndex.value - 1
	for (; index >= 0 && result.length < 2; index--) {
		const candidate = session.threadHistory.get(index)
		if (candidate.thread.length <= 1) continue

		// If this thread is completely contained by any recorded thread, it doesn't count
		// It would be invisible anyways

		let connections: MapConnection[] = [...threadToConnections(candidate.thread)]
		for (const connection of connections) {
			if (!allConnections.has(connection)) {
				// This thread is unique enough to be shown
				result.push(candidate)
				for (const c of connections) {
					allConnections.add(c)
				}
				break
			}
		}
	}

	return result
}

let view: HTMLElement = null
let container: HTMLElement = null
let wires: SVGSVGElement = null
let highlightWires: SVGSVGElement = null

let dateDetails: Point & { connection: MapConnection } = null
let showDateTimeout = null

$: placeNodes(nodes, $connectionsStore, wires)
function placeNodes(nodes: MapNode[], _c?, _w?) {
	session.undoStack.collapseIntoPreviousGroup(() => {
		placeMapNodes(nodes, {
			horizontalSpacing: 40,
			verticalSpacing: 20
		})
	})

	// Find the new size of the map
	let width = 0
	let height = 0
	
	for (const node of nodes) {
		width = Math.max(width, node.x + node.width)
		height = Math.max(height, node.y + node.height)
	}
	
	// Update wire size
	if (wires) {
		wires.style.width = width + 'px'
		wires.style.height = height + 'px'
	}

	if (highlightWires) {
		highlightWires.style.width = width + 'px'
		highlightWires.style.height = height + 'px'
	}

	// Sort the connections so that the most visible & bright are on top
	let newConnections: ConnectionMeta[] = []
	for (const connection of map.connections.value) {
		newConnections.push(getConnectionMeta(connection))
	}

	newConnections.sort((a, b) => a.sortOrder - b.sortOrder)

	connections = newConnections
	cleanupConnectionHover()
	
	placedNodes = nodes
}

const metaThreadMax = 10
type ConnectionMeta = {
	connection: MapConnection
	threadIndex?: number // 0 is current, 0-n is thread history
	sortOrder: number // 0 is soft, 1 is hard, 10 is thread, 10-n is thread history
	thread: TreeNode[]
}
function getConnectionMeta(connection: MapConnection): ConnectionMeta {
	const meta: ConnectionMeta = {
		connection,
		sortOrder: 0,
		thread: null
	}

	if (connectionIsOnThread(threadStack, connection)) {
		meta.sortOrder = metaThreadMax
		meta.threadIndex = 0
		meta.thread = threadStack
		return meta
	}

	for (let i = 0; i < threadHistoryStack.length; i++) {
		if (connectionIsOnThread(threadHistoryStack[i].thread, connection)) {
			meta.thread = threadHistoryStack[i].thread
			meta.sortOrder = metaThreadMax - i - 1
			meta.threadIndex = meta.sortOrder - metaThreadMax
			return meta
		}
	}

	if (connection.strength.value === MapStrength.Full) {
		meta.sortOrder = 1
	}

	return meta
}

function connectionIsOnThread(stack: TreeNode[], connection: MapConnection) {
	const index = stack.indexOf(connection.fromTreeNode)
	return index >= 0 && stack.indexOf(connection.toTreeNode) === index + 1
}

let needsToRePlace = false
function triggerRePlace() {
	if (!needsToRePlace) {
		needsToRePlace = true
		tick().then(() => {
			placeNodes(nodes)
			needsToRePlace = false
		})
	}
}

function ensureCurrentNodeIsContained(scrollTime=0) {
	if (!container) return
	// Ensure that the current node is visible
	const elementList = container.getElementsByClassName('MapNodeView current')
	if (elementList.length) {
		const element = elementList.item(0)
		const elementContainer = element.getBoundingClientRect()
		const viewContainer = view.getBoundingClientRect()
		const buffer = 100

		let scrollX: number = undefined
		if (elementContainer.left - buffer < viewContainer.left) {
			scrollX = elementContainer.left + view.scrollLeft - buffer
		}
		else if (elementContainer.bottom + buffer > viewContainer.right) {
			scrollX = elementContainer.right + view.scrollLeft - viewContainer.width + buffer
		}

		let scrollY: number = undefined
		if (elementContainer.top - buffer < viewContainer.top) {
			scrollY = elementContainer.top + view.scrollTop - buffer
		}
		else if (elementContainer.bottom + buffer > viewContainer.bottom) {
			scrollY = elementContainer.bottom + view.scrollTop - viewContainer.height + buffer
		}

		if (scrollX !== undefined || scrollY !== undefined) {
			setScroll(scrollX, scrollY, scrollTime)
		}
	}
}

function setScroll(scrollX?: number, scrollY?: number, scrollTime?: number) {
	if (scrollTime) {
		scrollTo({
			container: view,
			duration: scrollTime,
			x: scrollX,
			y: scrollY
		})
	}
	else {
		if (scrollX) {
			view.scrollLeft = scrollX
		}
		if (scrollY) {
			view.scrollTop = scrollY
		}
	}
}

$: onCurrentNodeChange($current?.currentNode)
function onCurrentNodeChange(theNode: TreeNode) {
	if (view) {
		tick().then(() => {
			ensureCurrentNodeIsContained(100)
		})
	}
}

type DragState = 'off' | 'threading'
let dragState: DragState

function onMapNodeMouseDown(event: MouseEvent, node: MapNode) {
	const treeNode = node.node.value
	const newThread: TreeNode[] = []
	if (treeNode) {
		newThread.push(treeNode)
	}

	startThreadingDrag(newThread)
	
	event.preventDefault()
}

function startThreadingDrag(thread: TreeNode[]) {
	dragState = 'threading'

	const initialLength = thread.length
	threadStack = thread

	startDrag({
		end() {
			const thread = threadStack
			if (thread.length > initialLength) {

				let currentNode = $current.currentNode
				if (!thread.includes(currentNode)) {
					currentNode = thread.at(-1)
				}

				const updateThreadOptions = {
					thread,
					currentNode
				}

				if (isActive) {
					session.undoStack.withUndoGroup(() => {
						thread.reduce((p, c) => {
							if (p) {
								const previousNode = map.get(p)
								const currentNode = map.get(c)

								session.map.connect({
									from: previousNode.node.value,
									to: currentNode.node.value,
									strength: MapStrength.Navigated
								})
							}
							return c
						})
						session.updateThread(updateThreadOptions)
					})
				}
				else {
					updateThread(updateThreadOptions)
				}
			}

			threadStack = [...$current.thread]
			dragState = 'off'
		}
	})
}

function onMapNodeMouseEnter(event: MouseEvent, node: MapNode) {
	if (dragState === 'threading') {
		if (!threadStack.includes(node.node.value)) {
			threadStack = [...threadStack, node.node.value]
		}
	}
}

function onMapNodeClick(event: MouseEvent, node: MapNode) {
	if (event.defaultPrevented) return
	if ((event as any).popup) return

	const treeNode = node.node.value

	if (event.shiftKey) {
		updateThread({
			currentNode: treeNode,
			thread: [...$current.thread, treeNode]
		})
		event.preventDefault()
	}
	else if ((isMac && event.metaKey) || (!isMac && event.ctrlKey)) {
		updateThread({
			from: $current.currentNode,
			currentNode: treeNode
		})
		event.preventDefault()
	}
	else {
		updateThread({ currentNode: treeNode, thread: 'retain' })
		event.preventDefault()
	}
}

function onMapNodeDoubleClick(event: MouseEvent, node: MapNode) {
	session.updateThread({ currentNode: node.node.value, thread: 'retain' })
	workspace.commands.setThreadFocusLevel.execute({})
}

function onContextMenu(event: MouseEvent) {
	stopDrag()
	appendContextTemplate(event, [
		{
			label: 'Show Map Documentation',
			click: () => {
				workspace.api.documentation.open('Map View')
			}
		}
	], 'bottom')
}

function onMapNodeContextMenu(event: MouseEvent, node: MapNode) {

	const options: ContextMenuConstructorOptions[] = [
		{
			label: 'Show in Thread',
			accelerator: 'Enter',
			click: () => {
				updateThread({ currentNode: node.node.value, thread: 'retain' })
				workspace.commands.setThreadFocusLevel.execute({})
			}
		},
		{
			label: 'Focus on This',
			accelerator: 'CommandOrControl+Enter',
			click: () => {
				updateThread({ currentNode: node.node.value, thread: 'retain' })
				workspace.commands.toggleFocusMode.execute({})
			}
		}
	]

	if (isActive) {
		const children = node.getOutLinks()
		if (children.length > 0) {
			options.push(
				{ type: 'separator' },
				{
					label: 'Show All Children',
					command: workspace.commands.showAllChildMapNodes,
					commandContext: {
						initiatingEvent: event,
						node,
						session
					}
				}
			)
		}

		const removeContext: RemoveFromMapCommandContext = {
			session,
			node: node.node.value,
			initiatingEvent: event
		}
		options.push(
			{ type: 'separator' },
			{
				label: 'Remove from Map',
				command: workspace.commands.removeNodeFromMap,
				commandContext: removeContext
			},
			{
				label: 'Remove This and All Children',
				command: workspace.commands.removeNodeAndChildrenFromMap,
				commandContext: removeContext
			},
			{
				label: 'Remove All But This and Children',
				command: workspace.commands.removeEverythingButNodeFromMap,
				commandContext: removeContext
			}
		)

		if ($current.thread.includes(node.node.value)) {
			options.push({
				label: 'Remove All But This Thread',
				command: workspace.commands.removeEverythingButThreadFromMap,
				commandContext: removeContext
			})
		}
	}

	appendContextTemplate(event, options)
}

function onMapNodeAddLink(node: TreeNode, direction: 'in'|'out', mapNode: MapNode) {
	const originNode = mapNode.node.value
	const originThreadIndex = $current.thread.indexOf(originNode)

	const update: UpdateThreadOptions = {
		currentNode: originThreadIndex >= 0 ? node : null
	}

	switch (direction) {
		case 'in':
			update.from = node
			update.to = mapNode.node.value
			break
		case 'out':
			update.from = mapNode.node.value
			update.to = node
			break
	}

	if (isActive) {
		session.undoStack.withUndoGroup(() => {
			map.getOrCreate(node, MapStrength.Full)
			map.connect({
				from: update.from,
				to: update.to
			})

			if (update.currentNode) {
				session.updateThread(update)
			}
		})
	}
	else if (update.currentNode) {
		updateThread(update)
	}
}

function navigateToGeneration(mode: 'parent' | 'child', stretchThread: boolean) {
	let currentMapNode = map.get($current.currentNode)
	if (!currentMapNode) return

	let first: MapNode = null
	let onThread: MapNode = null
	let closest: MapNode = null
	let closestDistance = Number.MAX_VALUE

	const currentPoint = currentMapNode.center()
	const list = mode === 'parent' ? currentMapNode.incoming : currentMapNode.outgoing

	for (const connection of list) {
		const node = mode === 'parent' ? connection.from.value : connection.to.value
		if (!first) {
			first = node
		}
		if ($current.thread.includes(node.node.value)) {
			onThread = node
		}

		const distance = Point.squareDistance(
			currentPoint,
			node.center())
		
		if (!closest || distance < closestDistance) {
			closest = node
			closestDistance = distance
		}
	}

	// TODO: decide whether closest or first is better
	const target = onThread || closest || first
	if (!target) return
	
	if (stretchThread) {
		session.updateThread({
			currentNode: target.node.value,
			from: mode === 'child' ? currentMapNode.node.value : null,
			to: mode === 'parent' ? currentMapNode.node.value : null
		})
	}
	else {
		session.updateThread({ currentNode: target.node.value, thread: 'retain' })
	}

	return true
}

function navigateToSibling(direction: number) {
	let currentMapNode = map.get($current.currentNode)
	if (!currentMapNode) return

	let closest: MapNode = null
	let closestDistance = Number.MAX_VALUE

	const currentPoint = currentMapNode.center()

	function measureDistance(item: MapNode) {
		if (item === currentMapNode) return

		const itemPoint = item.center()

		if (direction > 0 && itemPoint.y < currentPoint.y) return
		if (direction < 0 && itemPoint.y > currentPoint.y) return

		const distance = Point.squareDistance(
			currentPoint,
			itemPoint)
	
		if (!closest || distance < closestDistance) {
			closest = item
			closestDistance = distance
		}
	}

	for (const inConnection of currentMapNode.incoming) {
		for (const siblingConnection of inConnection.from.value.outgoing) {
			measureDistance(siblingConnection.to.value)
		}
	}

	for (const outConnection of currentMapNode.outgoing) {
		for (const siblingConnection of outConnection.to.value.incoming) {
			measureDistance(siblingConnection.from.value)
		}
	}

	if (!closest) return

	const currentThreadIndex = $current.thread.indexOf(currentMapNode.node.value)
	if (currentThreadIndex >= 0) {
		// We can potentially shift the node while retaining thread context
		let from = $current.thread[currentThreadIndex - 1]
		let to = $current.thread[currentThreadIndex + 1]

		closest.incoming.find(c => c.from.value.node.value === from) ? from : null
		closest.outgoing.find(c => c.to.value.node.value === to) ? from : null

		session.updateThread({
			currentNode: closest.node.value,
			from, to
		})
	}
	else {
		session.updateThread({ currentNode: closest.node.value, thread: 'retain' })
	}

	return true
}

function broadDirectionalNavigate(direction: Point) {
	let currentMapNode = map.get($current.currentNode)
	if (!currentMapNode) return

	let closest: MapNode = null
	let closestDistance = Number.MAX_VALUE

	const currentPoint = currentMapNode.center()

	for (const item of map.nodes.values()) {
		if (item === currentMapNode) continue

		const itemPoint = item.center()
		const dirToItem = Point.normalize(Point.subtract(itemPoint, currentPoint))
		const dot = Point.dot(direction, dirToItem)

		if (dot < .5) continue

		const distance = Point.squareDistance(
			currentPoint,
			itemPoint)
	
		if (!closest || distance < closestDistance) {
			closest = item
			closestDistance = distance
		}
	}

	if (!closest) return
	session.updateThread({ currentNode: closest.node.value, thread: 'retain' })
	return true
}

function openMenus(type: 'in' | 'out') {
	let currentMapNode = map.get($current.currentNode)
	if (!currentMapNode) return

	// Some serious intertwining going on here, let me tell you what
	let element = view.querySelector(`#${currentMapNode.domID()} button.${type}`)
	if (element) {
		(element as HTMLElement).click()
		return true
	}
}

function interpretKeyboardEvent(event: KeyboardEvent) {
	if (!isActive) return
	switch (event.key) {
		case 'ArrowLeft':
			if (event.ctrlKey || event.metaKey) {
				return openMenus('in')
			}
			return navigateToGeneration('parent', event.shiftKey) || broadDirectionalNavigate(Point.Left)
		case 'ArrowRight':
			if (event.ctrlKey || event.metaKey) {
				return openMenus('out')
			}
			return navigateToGeneration('child', event.shiftKey) || broadDirectionalNavigate(Point.Right)
		case 'ArrowUp':
			return navigateToSibling(-1) || broadDirectionalNavigate(Point.Up)
		case 'ArrowDown':
			return navigateToSibling(1) || broadDirectionalNavigate(Point.Down)
		case 'Enter':
			if (event.metaKey || event.ctrlKey) {
				workspace.commands.toggleFocusMode.execute({})
			}
			else {
				workspace.commands.setThreadFocusLevel.execute({})
			}
			return true
		default:
			// TODO: Some kind of command override/derive system
			const shortcut = shortcutFromEvent(event)
			console.log(shortcut, event)
			if (workspace.commands.undo.shortcuts.includes(shortcut)) {
				session.undoStack.undo()
				return true
			}
			else if (workspace.commands.redo.shortcuts.includes(shortcut)) {
				session.undoStack.redo()
				return true
			}
			return false
	}
}

function onKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented) return

	if (interpretKeyboardEvent(event)) {
		event.preventDefault()
	}
	else {
		markEventAsShortcutable(event)
	}
}

function onConnectionMouseDown(event: MouseEvent, meta: ConnectionMeta) {
	
	const thread = [meta.connection.fromTreeNode, meta.connection.toTreeNode]

	startThreadingDrag(thread)

	event.preventDefault()
}

function onConnectionClick(event: MouseEvent, meta: ConnectionMeta) {
	if (event.altKey && isActive) {
		session.undoStack.withUndoGroup(() => {
			map.disconnect(meta.connection)
		})
		return event.preventDefault()
	}

	if (meta.thread) {
		const thread = meta.thread
		updateThread({ thread })
		return event.preventDefault()
	}
	else {
		// Connect the two items
		updateThread({
			thread: [ meta.connection.fromTreeNode, meta.connection.toTreeNode ]
		})
	}
}

function onConnectionMouseEnter(event: MouseEvent, meta: ConnectionMeta) {
	if (showDateTimeout) clearTimeout(showDateTimeout)

	showDateTimeout = setTimeout(() => {
		const rect = view.getBoundingClientRect()
		dateDetails = {
			x: event.clientX - rect.x + view.scrollLeft,
			y: event.clientY - rect.y + view.scrollTop - 50,
			connection: meta.connection
		}

		if (meta.threadIndex != undefined && meta.threadIndex !== 0) {
			const newHighlightConnection: ConnectionMeta[] = []

			for (const connection of map.connections.value) {
				if (connectionIsOnThread(meta.thread, connection)) {
					newHighlightConnection.push({
						connection,
						sortOrder: 1,
						thread: meta.thread,
						threadIndex: meta.threadIndex
					})
				}
			}

			highlightConnections = newHighlightConnection
		}
	}, 500)
}

export function mapStrengthDescription(strength: MapStrength) {
	switch (strength) {
		case MapStrength.None:
			return 'Not Connected'
		case MapStrength.Connected:
			return 'Mentioned'
		case MapStrength.Navigated:
			return 'Navigated'
		case MapStrength.Full:
			return 'Followed'
	}
}

function onConnectionMouseLeave() {
	cleanupConnectionHover()
}

function cleanupConnectionHover() {
	clearTimeout(showDateTimeout)
	dateDetails = null

	if (highlightConnections.length) {
		highlightConnections = []
	}
}

</script>

<svelte:window on:keydown={commandHandler} />

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<main
	bind:this={view}
	class="MapView"
	class:active={isActive}
	tabindex={isActive ? 0 : undefined}
	on:keydown={onKeydown}
	on:contextmenu={onContextMenu}
>
	<div bind:this={container} class="container">
		<svg bind:this={wires}>
		{#each connections as meta (meta.connection.id)}
			<MapConnectionView connection={meta.connection}
				threadIndex={meta.threadIndex}
				isThread={meta.threadIndex != undefined && meta.threadIndex <= 0} 
				on:click={e => onConnectionClick(e, meta)}
				on:pointerenter={e => onConnectionMouseEnter(e, meta)}
				on:pointerleave={onConnectionMouseLeave}
				on:pointerdown={e => onConnectionMouseDown(e, meta)}
			/>
		{/each}
		</svg>

		<svg bind:this={highlightWires} class="connectionHighlight">
		{#each highlightConnections as meta (meta.connection.id)}
			<MapConnectionView connection={meta.connection}
				threadIndex={meta.threadIndex}
				isThread={meta.threadIndex != undefined && meta.threadIndex <= 0}
			/>
		{/each}
		</svg>

		{#each placedNodes as mapNode (mapNode.node.value) }
			<MapNodeView
				{mapNode}
				current={mapNode.node.value === $current.currentNode}
				threaded={threadStack.includes(mapNode.node.value)}
				showIcon={$showIconsOnMapNodes}
				on:click={e => onMapNodeClick(e, mapNode)}
				on:dblclick={e => onMapNodeDoubleClick(e, mapNode)}
				on:contextmenu={e => onMapNodeContextMenu(e, mapNode)}
				on:pointerdown={e => onMapNodeMouseDown(e, mapNode)}
				onPointerEnter={e => onMapNodeMouseEnter(e, mapNode)}
				onNodeSizeUpdated={triggerRePlace}
				onAddLink={(node, direction) => onMapNodeAddLink(node, direction, mapNode)}
			/>
		{:else}
			<div class="empty">
				<SvgIcon
					ref="tangent-icon-nocolor.svg#icon"
					size="256"
					styleString="--iconStroke: var(--embossedBackgroundColor);"
					/>
				<div class="buttons">
					<!-- svelte-ignore a11y_consider_explicit_label -->
					<button use:command={{
						command: workspace.commands.createNewFile,
						labelShortcut: true
					}} class="subtle"></button>
					<!-- svelte-ignore a11y_consider_explicit_label -->
					<button use:command={{
						command: workspace.commands.goTo,
						labelShortcut: true
					}} class="subtle"></button>
					<!-- svelte-ignore a11y_consider_explicit_label -->
					<button use:command={{
						command: workspace.commands.setMapFocusLevel,
						labelShortcut: true
					}} class="subtle"></button>
				</div>
			</div>
		{/each}

		{#if dateDetails}
			<div class="date"
				transition:fly={{ duration: 500 }}
				style:transform={`translate(${dateDetails.x}px, ${dateDetails.y}px)`}
			>
				<span>{mapStrengthDescription(dateDetails.connection.strength.value)}</span>
				<span class="day">{shortestDayDate(dateDetails.connection.dateCreated)}</span>
				<span class="time">{clockTime(dateDetails.connection.dateCreated)}</span>
			</div>
		{/if}
	</div>
</main>

<style lang="scss">
main {
	position: relative;

	background: var(--noteBackgroundColor);
	
	&:not(.active) {
		opacity: .8;
	}
}

.container {
	position: relative;
	transform-origin: center;
}

svg {
	display: block;
	padding-bottom: 1.5em;
	
	&.connectionHighlight {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
		z-index: 1;
	}
}

.empty {
	color: var(--deemphasizedTextColor);
	font-style: italic;
	flex-grow: 1;

	display: flex;
	align-items: center;

	:global(svg) {
		display: block;
		margin: 0 8vw;
	}

	.buttons {
		display: flex;
		flex-direction: column;
		align-items: stretch;

		margin-top: 1em;
		gap: .25em;
		
		button {
			text-align: left;
			display: flex;
			justify-content: space-between;
			color: var(--deemphasizedTextColor);

			:global(.shortcut) {
				margin-left: 1em;
			}
		}
	}
}

.date {
	position: absolute;
	top: 0;
	left: -100px; /* This is to counteract the svg left padding */
	z-index: 10000;

	padding: .25em;
	font-size: smaller;

	&::before {
		content: '';
		position: absolute;
		z-index: 0;
		inset: 0;
		background-color: var(--noteBackgroundColor);
		opacity: .9;
		border-radius: var(--inputBorderRadius);
	}
	span {
		word-wrap: none;
		position: relative;
		z-index: 1;
	}
}
</style>
