<script lang="ts">
import { indexOfEquivalent, last } from '@such-n-such/core'
import type { NavigationData } from 'app/events'
import type { Workspace } from 'app/model'
import { NoteViewState } from 'app/model/nodeViewStates'
import type FeedViewState from 'app/model/nodeViewStates/FeedViewState'

import { FocusLevel } from 'common/dataTypes/TangentInfo'
import { MapStrength } from 'common/tangentMap/MapNode'
import { scrollTo } from 'app/utils'
import { cachedScroll } from 'app/utils/scrollCaching'
import type { ScrollToOptions } from 'app/utils/scrollto'

import type { TreeNode } from 'common/trees'
import { ForwardingStore } from 'common/stores'
import { areNodesOrReferencesEquivalent, getNode, TreeNodeOrReference } from 'common/nodeReferences'

import { createEventDispatcher, getContext, onMount, tick } from 'svelte'
import { fly } from 'svelte/transition'
import NodeViewSelector from './NodeViewSelector.svelte'
import SetCreationRules from './SetCreationRules.svelte'

const dispatch = createEventDispatcher<{ navigate: NavigationData }>()

const workspace = getContext('workspace') as Workspace

const maxWidth = workspace.settings.noteWidthMax

// TODO: This should eventually be some interface
export let state: FeedViewState
export let extraTop: number = 0
export let isCurrent: boolean
export let focusLevel: FocusLevel

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
let extraBottom = 0

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
		extraBottom = container.getBoundingClientRect().height * .8
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
			duration: 500
		})
	}
}

function onViewReady(item: TreeNodeOrReference) {
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
	if (feedContainer.scrollHeight - feedContainer.scrollTop - rect.height < extraBottom) {
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
	const height = feedContainer.getBoundingClientRect().height

	showCreateFromHover = event.y > height - 115
}

function forwardNavigation(event: CustomEvent<NavigationData>, item: TreeNodeOrReference) {
	const node = getNode(item, workspace.directoryStore)
	// Inject a navigation event from the feed to the feed child
	dispatch('navigate', {
		target: node,
		direction: event.detail.direction,
		origin: state.parent.node
	})
	// Pass on the presented event
	dispatch('navigate', {
		...event.detail
	})
}

function onScrollRequest(event: CustomEvent<ScrollToOptions>, item: TreeNodeOrReference) {
	let options = event.detail
	options.container = feedContainer
	scrollTo(options)
}

function nodeClick(event: MouseEvent, item: TreeNodeOrReference) {
	if (event.defaultPrevented) return

	overrideRealFocus = false

	preventScrollToCurrentNode()
	$currentItem = item
}

function extraBottomClick(event: MouseEvent) {
	// This is all a bit of a hack, but the goal is to make it so that clicking
	// at the end of the feed
	preventScrollToCurrentNode()
	$currentItem = last(feedNodes)
	const itemState = state.context.getState($currentItem)
	if (itemState && itemState instanceof NoteViewState) {
		const length = itemState.node.length
		itemState.selection = [length - 1, length - 1]
		state.focus(feedContainer)
	}
}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
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
			on:click={e => nodeClick(e, item)}
		>
			<NodeViewSelector
				state={state.context.getState(item, true)}
				isCurrent={isCurrent && item === $currentItem}
				background="none"
				layout="auto"
				focusLevel={overrideRealFocus ? FocusLevel.Thread : focusLevel}
				on:navigate={e => forwardNavigation(e, item)}
				on:view-ready={e => onViewReady(item)}
				on:scroll-request={e => onScrollRequest(e, item)}
			/>
		</div>
	{/each}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="extraBottom" style:height={`${extraBottom}px`} on:click={extraBottomClick}></div>
	
</div>

{#if showCreateFromScroll || showCreateFromHover}
	<div class="createContainer" transition:fly={{ y: 200 }} class:hidden={!willCreateNewFiles}>
		<div class="create" style:max-width={`${$maxWidth}px`}>
			<SetCreationRules state={state.parent} max={3} direction="row" bind:willCreateNewFiles />
		</div>
	</div>
{/if}

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

.createContainer {
	position: absolute;
	bottom: 4em;
	left: 0;
	right: 0;

	z-index: 2;

	&.hidden {
		bottom: -200px;
	}
}

.create {
	display: flex;
	justify-content: stretch;
	margin: 0 auto;

	border-radius: var(--inputBorderRadius);

	background: var(--backgroundColor);
	color: var(--deemphasizedTextColor);
}

.feed .note :global(.fixedTitle) > :global(header::before) {
	height: var(--fixedHeaderExtraTop);
} 
</style>
