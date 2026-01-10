<script lang="ts">
import { createEventDispatcher, getContext, tick } from 'svelte'
import { fly } from 'svelte/transition'
import { flip } from 'svelte/animate'
import { scrollTo } from 'app/utils'

import type Tangent from "app/model/Tangent"
import type Workspace from 'app/model/Workspace'
import command from 'app/model/commands/CommandAction'
import { resizeObserver } from 'app/utils/resizeObserver'

import { FocusLevel } from 'common/dataTypes/TangentInfo'
import { derived } from 'svelte/store'
import type { NavigationCallback, NavigationData } from 'app/events'
import NodeViewSelector from '../node-views/NodeViewSelector.svelte'
import ThreadViewVerticalTitleBar from './ThreadViewVerticalTitleBar.svelte'
import type { NodeViewState } from 'app/model/nodeViewStates'
import SvgIcon from '../smart-icons/SVGIcon.svelte'
import { wait } from '@such-n-such/core'

// TODO: These should be based on settings values
const collapsedWidth = 32

const workspace = getContext('workspace') as Workspace

const {
	createNewFile,
	goTo,
	setMapFocusLevel
} = workspace.commands

const {
	panelWidthMin,
	dirtyIndicatorVisibility
} = workspace.settings

export let tangent: Tangent

export let onNavigate: NavigationCallback = null

$: focusLevel = tangent.focusLevel
$: currentNode = tangent.currentNode
$: currentState = tangent.currentThreadState

let lastFocusLevel = $focusLevel
let isFirstView = true

// Latch scroll requests to avoid duplicate requests
let scrollToCurrentDelay = null
function requestScrollToCurrent() {
	if (!scrollToCurrentDelay) {
		scrollToCurrentDelay = wait().then(() => {
			scrollToCurrent($currentState)
			scrollToCurrentDelay = null
		})
	}
}

const states = derived([tangent.focusLevel, tangent.threadLenses, tangent.currentThreadState], ([fl, lenses, currentState]) => {
	let result: NodeViewState[]
	if (fl <= FocusLevel.Thread) {
		result = lenses.map(l => l.parent)
	}
	else {
		result = currentState ? [currentState] : []
	}
	if (lastFocusLevel !== fl) {
		// This is necessary because sizes can shift over the course of the transition in/out of focus
		// TODO: This causes rightmost notes to restore from focus strangely
		setTimeout(() => scrollToCurrent(currentState), 310)
		lastFocusLevel = fl
	}
	else {
		// Delay so that the new nodes list is available
		// Goes through latch to avoid duplicate requests
		requestScrollToCurrent()
	}
	return result
})

const supportDirty = derived([tangent.focusLevel, states, dirtyIndicatorVisibility], ([fl, states, di]) => {
	if (di === 'focus') return true
	if (di === 'single-file') return fl === FocusLevel.Thread
	if (di === 'thread') return states.length > 1
	return false
})

$: currentStateIndex = $states.indexOf($currentState)

let container: HTMLElement
let scrollStopper: () => void = null

let containerBasedMin = 10000
$: trueMinWidth = Math.min(containerBasedMin, $panelWidthMin)
function onContainerResized(entries: ResizeObserverEntry[]) {
	const entry = entries[0]
	if (entry) {
		containerBasedMin = Math.max(
			entry.contentBoxSize[0].inlineSize - collapsedWidth * ($states.length - 1),
			260 // A fallback "true minimum"
		)
	}
}


$: scrollToCurrent(null, container, trueMinWidth) // Only want to trigger this outside of the $lenses derived store when the container changes
function scrollToCurrent(state: NodeViewState, _c?, minWidth = trueMinWidth) {
	state = state || $currentState
	if (!state || !container || !$states) return

	const lensIndex = $states.indexOf(state)
	if (lensIndex < 0) return

	setTimeout(() => {
		if (!container) return
		const containerRect = container.getBoundingClientRect()
		const containerScroll = container.scrollLeft

		const max = minWidth * lensIndex - collapsedWidth * lensIndex
		const min = max - (containerRect.width - minWidth - collapsedWidth * ($states.length - 1))

		if (containerScroll > min && containerScroll < max) {
			return
		}

		if (scrollStopper) {
			scrollStopper()
		}

		const distanceToMax = Math.abs(max - containerScroll)
		const distanceToMin = Math.abs(min - containerScroll)

		const x = distanceToMin < distanceToMax ? min : max
		if (x === containerScroll) {
			return
		}

		scrollStopper = scrollTo({
			container,
			duration: isFirstView ? 0 : 300,
			x, 
			onDone: () => {
				scrollStopper = null
			}
		})

		isFirstView = false
	})

	// Apply Focus
	const nodeContainer = container.children[lensIndex]
	if (!nodeContainer.contains(document.activeElement)) {
		if (state?.focus) {
			state.focus(nodeContainer as HTMLElement)
		}
	}
}

function getNodeContainerStyle(index: number, min: number) {
	let result = `min-width: ${min}px;`
	result += `left: ${collapsedWidth * index}px;`
	result += `right: -${min - collapsedWidth * ($states.length - index)}px;`
	return result
}

function handleNavigate(data: NavigationData) {
	const origin = data.origin
	if (origin !== 'current') {
		tangent.updateThread({ currentNode: origin, thread: 'retain' })
	}
	if (onNavigate) onNavigate(data)
}

function onNodeContainerClicked(event: MouseEvent, state: NodeViewState) {
	if (event.defaultPrevented) return
	
	// Use state instead of node to account for states representing other nodes
	if ($currentState !== state) {
		if ($states.includes(state)) {
			console.log('clicked changing current')
			tangent.updateThread({ currentNode: state.node, thread: 'retain' })
		}
	}
	else {
		// We always want to scroll to the thing we've clicked on
		console.log('clicked scrolling current')
		scrollToCurrent(state)
	}
}

function onWheel(event: WheelEvent, state: NodeViewState) {
	// Forward along for containers
	(event as any).treeNode = state.node
}
</script>

<main bind:this={container}
	use:resizeObserver={onContainerResized}
	class="ThreadView"
	class:multiple={$states.length > 1}>
	{#each $states as state, index (state)}
		{@const isCurrent = state === $currentState}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div class="nodeContainer"
			style={getNodeContainerStyle(index, trueMinWidth)}
			class:current={isCurrent}
			on:click={e => onNodeContainerClicked(e, state)}
			on:wheel={e => onWheel(e, state)}
			in:fly|global={{
				x: currentStateIndex > index ? -500 : 500, 
				duration: $states.length > 1 ? 200 : 0 
			}}
			animate:flip={{ duration: 200 }}>
			<div class="viewContainer"
				style={`left: ${$states.length > 1 ? collapsedWidth : 0}px;`}>
				<NodeViewSelector
					{state}
					{isCurrent}
					extraTop={36}
					focusLevel={Math.max($focusLevel, FocusLevel.Thread)}
					onNavigate={handleNavigate}
				/>
			</div>
			<ThreadViewVerticalTitleBar
				node={state.node}
				{tangent}
				{collapsedWidth}
				supportDirty={$supportDirty}
			/>
		</div>
	{:else}
		<div class="empty">
			<SvgIcon
				ref="tangent-icon-nocolor.svg#icon"
				size="256"
				styleString="--iconStroke: var(--embossedBackgroundColor);"
				/>
			<h1>No files in your thread. Create or open a note from the left sidebar.</h1>
			<div class="buttons">
				<!-- svelte-ignore a11y_consider_explicit_label -->
				<button use:command={{
					command: createNewFile,
					labelShortcut: true
				}} class="subtle"></button>
				<!-- svelte-ignore a11y_consider_explicit_label -->
				<button use:command={{
					command: goTo,
					labelShortcut: true
				}} class="subtle"></button>
				<!-- svelte-ignore a11y_consider_explicit_label -->
				<button use:command={{
					command: setMapFocusLevel,
					labelShortcut: true
				}} class="subtle"></button>
			</div>
		</div>
	{/each}
</main>

<style lang="scss">


main {
	display: flex;
	height: 100%;
	width: 100%;
	position: relative;
	overflow-x: auto;
	overflow-y: hidden;

	background: var(--noteBackgroundColor);
}

.nodeContainer {
	position: sticky;
	top: 0;
	bottom: 0;
	overflow-y: auto;

	flex-grow: 1;

	background-color: var(--noteBackgroundColor);

	&:not(:first-child) {
		box-shadow: 0 0 5px rgba(0, 0, 0, .3);
	}
}

.viewContainer {
	position: absolute;
	top: 0;
	bottom: 0;
	right: 0;

	overflow: hidden;
}

.empty {
	margin-top: 25vh;
	color: var(--deemphasizedTextColor);
	font-style: italic;
	text-align: center;
	flex-grow: 1;

	h1 {
		margin-top: 10vh;
		font-size: 110%;
		font-weight: normal;
	}

	.buttons {
		display: inline-flex;
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
</style>
