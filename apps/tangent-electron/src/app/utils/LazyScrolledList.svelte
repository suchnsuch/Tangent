<script lang="ts">

import { afterUpdate, createEventDispatcher, onMount, tick } from 'svelte';
import { findParentScrollContainer } from './scrolling';

const dispatch = createEventDispatcher<{
	'range-updated': undefined
}>()

export let items: any[]
export let mode: 'buffer' | 'append' = 'buffer'
export let groupStep = 50
export let itemID: (item: any) => any = null
export let scrollContainer: HTMLElement = null

let itemsContainer: HTMLElement

let perItemHeight = 0
let itemsPerRow = 1

let preHeights: number[] = []
let itemRange: [number, number] = [0, groupStep * 2]

$: preHeight = preHeights.reduce((prev, current) => prev + current, 0)
$: postHeight = Math.max(perItemHeight * (items.length - itemRange[1]) / itemsPerRow, 0)

onMount(() => {
	return () => {
		scrollContainer?.removeEventListener('scroll', onScroll)
	}
})

afterUpdate(() => {
	if (!scrollContainer) {
		tick().then(() => {
			scrollContainer = findParentScrollContainer(itemsContainer)
		})
	}

	if (perItemHeight === 0 && items.length > 0) {
		// TODO: average of all visible?
		perItemHeight = itemsContainer.children[1]?.getBoundingClientRect().height ?? 0
	}
})

$: bindContainer(scrollContainer)
function bindContainer(container: HTMLElement) {
	container?.addEventListener('scroll', onScroll)
}

function onScroll(event: Event) {
	evaluateVisibility()
}

function evaluateVisibility(direction=0) {
	const itemsRect = itemsContainer.getBoundingClientRect()
	const scrollRect = scrollContainer.getBoundingClientRect()

	// Need to take into account content above this lazy scrolled list
	const scrollOffset = itemsRect.top - (scrollRect.top - scrollContainer.scrollTop)

	// `direction` serves as a safety lock as this is an async recursive function.
	// Once we're adjusting in a direction, further adjustments can only occur in
	// that same direction. This stops potential situations thrashing back and forth.
	// This thrashing had been observed a handful of times that were not obviously replicated.
	if (direction <= 0 && scrollContainer.scrollTop < scrollOffset) {
		if (itemRange[0] > 0 && mode === 'buffer') {
			preHeights.pop()
			preHeights = preHeights
			itemRange = [itemRange[0] - groupStep, itemRange[1] - groupStep]
			
			tick().then(() => {
				dispatch('range-updated')
				evaluateVisibility(-1)
			})
		}
	}
	else if (direction >= 0) {
		if (itemRange[1] < items.length) {
			if (mode === 'buffer' && scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollRect.height < postHeight) {
				let chunk = 0
				let lastTop: number = null
				let rowCount = 0
				for (let index = 0; index < groupStep; index++) {
					rowCount++
					const itemRect = itemsContainer.children[index].getBoundingClientRect()
					if (itemRect.top !== lastTop) {
						// Allow the system to understand rows
						chunk += itemRect.height
						lastTop = itemRect.top

						if (rowCount !== itemsPerRow) {
							itemsPerRow = rowCount
						}

						rowCount = 0
					}
				}
				preHeights.push(chunk)
				preHeights = preHeights

				itemRange = [itemRange[0] + groupStep, itemRange[1] + groupStep]

				tick().then(() => {
					dispatch('range-updated')
					evaluateVisibility(1)
				})
			}
			else if (mode === 'append') {
			 	if (scrollRect.bottom >= itemsRect.bottom - .9) {
					itemRange = [itemRange[0], itemRange[1] + groupStep]
					tick().then(() => {
						dispatch('range-updated')
					})
				}
			}
		}
	}
}

$: visibleItems = determineVisibleItems(items, itemRange)
function determineVisibleItems(items: any[], itemRange) {
	if (!items) return []
	return items.slice(itemRange[0], itemRange[1])
}

</script>

{#if mode === 'buffer'}
	<div style:height={preHeight + 'px'}></div>
{/if}
<div bind:this={itemsContainer} class="lazy-list-items">
	{#each visibleItems as item, i (itemID ? itemID(item) : item) }
		<slot name="item" {item} index={i + itemRange[0]}></slot>
	{:else}
		<slot name="empty"></slot>
	{/each}
	<slot name="after"></slot>
</div>
{#if mode === 'buffer'}
	<div style:height={postHeight + 'px'}></div>
{/if}
