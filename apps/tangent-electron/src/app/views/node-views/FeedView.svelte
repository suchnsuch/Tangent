<script lang="ts">
import { indexOfEquivalent, last } from '@such-n-such/core'
import type { NavigationCallback, NavigationData } from 'app/events'
import type { Workspace } from 'app/model'
import { NoteViewState } from 'app/model/nodeViewStates'
import type FeedViewState from 'app/model/nodeViewStates/FeedViewState'

import { FocusLevel } from 'common/dataTypes/TangentInfo'
import { scrollTo } from 'app/utils'
import { cachedScroll } from 'app/utils/scrollCaching'
import type { ScrollToOptions } from 'app/utils/scrollto'

import { ForwardingStore } from 'common/stores'
import { areNodesOrReferencesEquivalent, getNode, type TreeNodeOrReference } from 'common/nodeReferences'

import { getContext, onMount, tick } from 'svelte'
import NodeViewSelector from './NodeViewSelector.svelte'
import FloatingSetCreationRules, { shouldShowCreationRulesFromHover } from './FloatingSetCreationRules.svelte'
import EmptyList from './EmptyList.svelte'
import { smoothScrollTime } from 'app/utils/style'

const workspace = getContext('workspace') as Workspace

// TODO: This should eventually be some interface
export let state: FeedViewState
export let extraTop: number = 0
export let extraBottom: number = 0
export let isCurrent: boolean
export let focusLevel: FocusLevel

export let onNavigate: NavigationCallback = null

const items = new ForwardingStore<TreeNodeOrReference[]>([])
const firstItem = new ForwardingStore<TreeNodeOrReference>(null)
const lastItem = new ForwardingStore<TreeNodeOrReference>(null)
const currentItem = new ForwardingStore<TreeNodeOrReference>(null)
const scrollY = new ForwardingStore<number>(0)

$: {
	items.forwardFrom(state.items)
	firstItem.forwardFrom(state.firstItem)
	lastItem.forwardFrom(state.lastItem)
	currentItem.forwardFrom(state.currentItem)
	scrollY.forwardFrom(state.scrollY)
}

$: startAt = state.settings.startAt

let feedContainer: HTMLElement
let _initialized = false
let computedExtraBottom = 0
$: effectiveExtraBottom = extraBottom + computedExtraBottom

/**
 * We don't want to restore cached scroll until all displayed items are ready to go.
 * On initial load, we wait for all initial items to be ready, _then_ restore the
 * cached scroll value
 */
let scrollResumeSucceeded: () => void = null
const scrollResumePromise = new Promise<void>((resolve, reject) => scrollResumeSucceeded = resolve)

onMount(() => {
	waitingOn = new Set()
	for (const node of feedNodes) {
		waitingOn.add(node)
	}
})

let waitingOn: TreeNodeOrReference | Set<TreeNodeOrReference>
function updateWaitingOn(item: TreeNodeOrReference) {
	if (waitingOn instanceof Set) {
		waitingOn.delete(item)
		if (waitingOn.size === 0) {
			waitingOn = null
			tick().then(() => {
				scrollResumeSucceeded()
				if (isCurrent) {
					state.focus(feedContainer)
				}
			})
		}
	}
	else if (waitingOn === item) {
		waitingOn = null
	}
}

let scrollToCurrentNode = true
/**
 * Suppresses scrolling to the current node until the given promise resolves.
 * @param until The promise to wait for, defaults to tick()
 */
function preventScrollToCurrentNode(until?: Promise<void>) {
	scrollToCurrentNode = false
	
	;(until ?? tick()).then(() => {
		scrollToCurrentNode = true
	})
}

// Used to drop/resume focus effects on scroll/selection
let overrideRealFocus = true

let showCreateFromScroll = false
let showCreateFromHover = false

let willCreateNewFiles = true


$: feedRange = getFeedRange($items, $firstItem, $lastItem, $currentItem)
function getFeedRange(items: TreeNodeOrReference[], first: TreeNodeOrReference, last: TreeNodeOrReference, current: TreeNodeOrReference): [number, number] {
	let start = items.indexOf(first)
	let end = items.indexOf(last)

	if (start < 0) {
		start = state.settings.startAt.value === 'beginning' ? 0 : items.length - 1
	}
	if (end < 0) {
		end = state.settings.startAt.value === 'beginning' ? 0 : items.length - 1
	}

	if (start > end) {
		// Assume sort has simply been reversed
		const swap = start
		start = end
		end = swap
	}

	$firstItem = items[start]
	$lastItem = items[end]

	let currentIndex = indexOfEquivalent(current, items, areNodesOrReferencesEquivalent)
	if (currentIndex < start) {
		$currentItem = items[start]
	}
	else if (currentIndex > end) {
		$currentItem = items[end]
	}

	return [start, end]
}

$: feedNodes = getFeedNodes($items, feedRange)
function getFeedNodes(items: TreeNodeOrReference[], range: [number, number]) {
	if (!items || items.length === 0) {
		return []
	}

	let [start, end] = range

	if (start < 0) start = items.length + start
	if (end < 0) end = items.length + end

	return items.slice(start, end + 1)
}

$: onStartAtChanges($startAt)
function onStartAtChanges(startAt) {
	// We want things to reset when the user switches startat
	if (_initialized) {
		_initialized = false
		waitingOn = null
	}
}

$: if (feedNodes) loadNextIfAppropriate()

$: updateFeedContainer(feedContainer, feedNodes, _initialized)
function updateFeedContainer(container: HTMLElement, items: TreeNodeOrReference[], initialized) {
	if (!initialized && container && items.length) {
		computedExtraBottom = container.getBoundingClientRect().height * .8
		_initialized = true
		if ($scrollY < 0) {
			tick().then(() => {
				// We need to be able to scroll up to trigger feed loading
				container.scrollTop = 40
			})
		}
	}
}

$: reactToCurrent($currentItem)
function reactToCurrent(currentNode) {
	if (!_initialized || !feedContainer || !scrollToCurrentNode || focusLevel > FocusLevel.Thread) return

	const feedIndex = feedNodes.indexOf(currentNode)
	const targetChild = feedContainer.children[feedIndex]
	if (targetChild) {

		const parentRect = feedContainer.getBoundingClientRect()
		const childRect = targetChild.getBoundingClientRect()

		const y = Math.max(childRect.top + feedContainer.scrollTop - parentRect.top, 40)

		scrollTo({
			container: feedContainer,
			// The extra one helps not overshoot the scroll mechanism
			y,
			duration: smoothScrollTime
		})
	}
}

function handleViewReady(item: TreeNodeOrReference) {
	if (!feedContainer) {
		return
	}

	const oldSize = feedContainer.scrollHeight
	const oldscroll = feedContainer.scrollTop

	if (waitingOn instanceof Set) {
		updateWaitingOn(item)
		return
	}

	tick().then(() => {
		// If we're waiting on a file, we don't want to adjust for that file
		// nor the one before it. The assumption is that we want those items
		// to expand downwards rather than upwards.
		const requiredIndex = waitingOn ? feedNodes.length - 2 : feedNodes.length - 1

		updateWaitingOn(item)

		if (feedNodes.indexOf(item) < requiredIndex) {
			const newSize = feedContainer.scrollHeight
			feedContainer.scrollTop = oldscroll + (newSize - oldSize)
		}
		else {
			loadNextIfAppropriate()
		}
		
		updateShowCreateFromScroll()
	})
}

function onFeedScroll() {
	if (!feedContainer) {
		return
	}

	if (feedContainer.scrollTop === 0) {
		const [ start, end ] = feedRange
		const nextStart = start - 1
		if (nextStart < 0) return

		$firstItem = $items[nextStart]

		const oldSize = feedContainer.scrollHeight

		tick().then(() => {
			const newSize = feedContainer.scrollHeight
			feedContainer.scrollTop = newSize - oldSize
		})
	}
	else {
		loadNextIfAppropriate()
	}

	updateShowCreateFromScroll()
}

function loadNextIfAppropriate() {
	if (!feedContainer || waitingOn) return
	
	const rect = feedContainer.getBoundingClientRect()
	if (feedContainer.scrollHeight - feedContainer.scrollTop - rect.height < effectiveExtraBottom) {
		let visibleIndex = feedNodes.indexOf($lastItem)
		if (visibleIndex === feedNodes.length - 1) {
			let [start, end] = feedRange
			if (end < $items.length - 1) {
				$lastItem = $items[end + 1]
				waitingOn = $lastItem
			}
		}
	}
}

function updateShowCreateFromScroll() {
	const height = feedContainer.getBoundingClientRect().height

	showCreateFromScroll = feedContainer.scrollHeight - feedContainer.scrollTop - height < height * .6
}

function updateShowCreateFromHover(event: MouseEvent) {
	showCreateFromHover = shouldShowCreationRulesFromHover(event, feedContainer)
}

function forwardNavigation(data: NavigationData, item: TreeNodeOrReference) {
	if (!onNavigate) return

	if (data.direction === 'out') {
		// Inject a navigation event from the feed to the feed child
		const node = getNode(item, workspace.directoryStore)
		if ($currentItem !== item) {
			onNavigate({
				target: node,
				direction: 'out',
				origin: state.parent.node
			})
		}

		// Pass on the event from the feed child to the target
		onNavigate({
			...data
		})
	}
	else if (data.direction === 'in') {
		// Replace origin with self so that feed lens is maintained
		onNavigate({
			...data,
			origin: state.parent.node
		})
	}
	else if (data.direction === 'replace') {
		// Pass on the normal event
		onNavigate({
			...data
		})
	}
}

function handleScrollRequest(options: ScrollToOptions, item: TreeNodeOrReference) {
	options.container = feedContainer
	scrollTo(options)
}

function onNodeFocusIn(event: FocusEvent, item: TreeNodeOrReference) {
	if (event.defaultPrevented) return

	overrideRealFocus = false

	preventScrollToCurrentNode()
	$currentItem = item
}

function nodeKeyboardExit(event: KeyboardEvent, item: TreeNodeOrReference) {
	const allIndex = $items.indexOf(item)
	const feedIndex = feedNodes.indexOf(item)
	if (allIndex < 0) return

	const direction = event.key === 'ArrowUp' ? -1 : (event.key === 'ArrowDown' ? 1 : undefined)
	if (direction === undefined) return

	const nextFeedIndex = feedIndex + direction
	if (nextFeedIndex < 0 || nextFeedIndex === feedNodes.length) {
		const nextRealIndex = allIndex + direction
		if (nextRealIndex < 0 || nextRealIndex >= $items.length) return
		// Summon the next item
		event.preventDefault()
		$currentItem = $items[allIndex + direction]
		return
	}

	// Perform selection directly
	const noteContainer = feedContainer.childNodes.item(nextFeedIndex)
	if (noteContainer instanceof HTMLElement) {
		event.preventDefault()
		const nextItem = feedNodes[nextFeedIndex]
		const viewState = state.context.getState(nextItem)
		if (viewState.focus) viewState.focus(noteContainer, direction === 1 ? 'start' : 'end')
		return
	}
}

function extraBottomClick(event: MouseEvent) {
	// This is all a bit of a hack, but the goal is to make it so that clicking
	// at the end of the feed
	preventScrollToCurrentNode()
	$currentItem = last(feedNodes)
	const itemState = state.context.getState($currentItem)
	if (itemState && itemState instanceof NoteViewState) {
		const length = itemState.node.length
		itemState.selection.set([length - 1, length - 1])
		state.focus(feedContainer)
	}
}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div class="feed"
	bind:this={feedContainer}
	on:scroll={onFeedScroll}
	on:wheel={_ => overrideRealFocus = true}
	on:keydown={_ => overrideRealFocus = false}
	use:cachedScroll={{ scrollY, applicationDelay: scrollResumePromise }}
	on:mousemove={updateShowCreateFromHover}
	style:padding-top={`${extraTop}px`}
	style:--fixedHeaderExtraTop={`${extraTop}px`}
>
	{#each feedNodes as item (item.path)}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div class="note"
			class:current={item === $currentItem} 
			on:focusin={e => onNodeFocusIn(e, item)}
		>
			<NodeViewSelector
				state={state.context.getState(item, true)}
				isCurrent={isCurrent && item === $currentItem}
				background="none"
				layout="auto"
				showDetails={false}
				focusLevel={overrideRealFocus ? FocusLevel.Thread : focusLevel}
				onNavigate={data => forwardNavigation(data, item)}
				onViewReady={() => handleViewReady(item)}
				onScrollRequest={options => handleScrollRequest(options, item)}
				onKeyboardExit={event => nodeKeyboardExit(event, item)}
			/>
		</div>
	{:else}
		<EmptyList {extraTop} />
	{/each}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="extraBottom" style:height={`${effectiveExtraBottom}px`} on:click={extraBottomClick}></div>
	
</div>

<FloatingSetCreationRules canShow={showCreateFromScroll || showCreateFromHover} state={state.parent} />

<style lang="scss">
.feed {
	position: absolute;
	inset: 0;

	overflow-x: hidden;
	overflow-y: auto;

	text-align: unset;
}

.note {
	padding-top: 2rem;
	padding-bottom: 2rem;

	&.current {
		position: relative;
		z-index: 1;
	}

	&:first-child {
		padding-top: 4rem;
	}
	&:last-child {
		padding-bottom: 4rem;
	}
}

.feed .note :global(.fixedTitle) > :global(header::before) {
	height: var(--fixedHeaderExtraTop);
} 
</style>
