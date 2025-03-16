<script lang="ts">
import { tick } from 'svelte';

import LazyScrolledList from './LazyScrolledList.svelte'
import scrollTo from './scrollto'
import { classesToSelector } from './style';
import { tooltip } from './tooltips'

export let containerClass = ''
let containerElement: HTMLElement

export let items: any[]
export let selectedIndex: number = 0

export let itemClass = ''
export let onItemEvent: (item: any, event: Event) => void = null
export let getItemTooltip: (item: any, index?: number) => string = null
export let itemID: (item: any) => any = null
export let takeFocus = false

export let scrollDuration = 100
export let scrollMargin = 10

$: {
	if (takeFocus && containerElement) {
		setTimeout(() => containerElement.focus(), 0)
	}
}

$: scrollToItem(items, selectedIndex, containerElement)
function scrollToItem(list, index, container: HTMLElement) {
	if (list && container) {
		tick().then(() => {
			const target = container.querySelector(classesToSelector(itemClass) + '.selected') as HTMLElement
			scrollTo({
				container,
				target,
				marginX: scrollMargin,
				marginY: scrollMargin,
				duration: scrollDuration
			})
		})
	}
}

function shiftSelection(shift: number) {
	const shiftedIndex = selectedIndex + shift
	if (shiftedIndex < 0) {
		selectedIndex = 0
	}
	else if (shiftedIndex >= items.length) {
		selectedIndex = items.length - 1
	}
	else {
		selectedIndex = shiftedIndex
	}
}

function mainKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented) return

	event.preventDefault()

	switch (event.key) {
		case 'ArrowDown':
			return shiftSelection(1)
		case 'ArrowUp':
			return shiftSelection(-1)
		default:
			return onItemEvent && onItemEvent(items[selectedIndex], event)
	}
}

function itemTitle(item, index) {
	if (getItemTooltip) return getItemTooltip(item, index)
}

</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<main
	bind:this={containerElement}
	class={containerClass}
	on:keydown={mainKeydown}
	tabindex="-1">
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<LazyScrolledList {items} {itemID}>
		<svelte:fragment slot="item" let:item let:index>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div
				class={itemClass}
				class:selected={index === selectedIndex}
				use:tooltip={itemTitle(item, index)}
				on:click={e => onItemEvent && onItemEvent(item, e) }>
				<slot name="item" {item}>{item}</slot>
			</div>
		</svelte:fragment>
		<svelte:fragment slot="empty"><slot name="empty"></slot></svelte:fragment>
	</LazyScrolledList>
</main>

<style lang="scss">
main {
	background-color: var(--backgroundColor);
	overflow-x: hidden;
	overflow-y: auto;

	&:focus {
		outline: none;
	}
}

div {
	padding: .2rem .4rem;
	border-radius: var(--inputBorderRadius);
	border: 2px solid transparent;

	cursor: pointer;

	&.selected, &:hover {
		border-color: var(--accentBackgroundColor);
		background-color: var(--accentBackgroundColor);
	}
}

main:hover div:hover:not(.selected) {
	background-color: unset;
}
</style>
