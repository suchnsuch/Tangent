<script lang="ts">
import { focusLayer } from 'app/utils'
import ScrollingItemList from 'app/utils/ScrollingItemList.svelte'
import { wrappedIndex } from 'common/collections'

type T = $$Generic
interface $$Slots {
	option: {
		option: T
	},
	empty: {},
	placeholder: {}
}

export let text: string
export let placeholderMode: 'always' | 'hideWithText' = 'hideWithText'
export let placeholder: string = 'Type to select...'

export let options: T[] = []
export let selectedIndex = 0
export let itemID: (item: any) => any = null
export let getItemTooltip: (item: any, index?: number) => string = null

export let onAutocomplete: (value: T) => void
export let onSelect: (option: T, event: MouseEvent | KeyboardEvent) => void

let inputElement: HTMLInputElement

$: {
	inputElement?.focus()
}

function onInputKey(event: KeyboardEvent) {
	switch (event.key) {
		case 'ArrowUp':
			event.preventDefault()
			selectedIndex = wrappedIndex(options, selectedIndex - 1)
			break
		case 'ArrowDown':
			event.preventDefault()
			selectedIndex = wrappedIndex(options, selectedIndex + 1)
			break
		case 'Tab':
			event.preventDefault()
			onAutocomplete(options[selectedIndex])
			break
		case 'Enter':
			event.preventDefault()
			const option = options[selectedIndex]
			if (option) {
				onSelect(option, event)
			}
			break
	}
}
</script>

<main use:focusLayer={'ModalInputSelect'}>
	<div class="inputContainer">
		<input
			bind:this={inputElement}
			bind:value={text}
			on:keydown={onInputKey}
			/>
		{#if placeholderMode === 'always' || !text}
			<div class="placeholder"><slot name="placeholder">{placeholder}</slot></div>
		{/if}
	</div>
	
	<ScrollingItemList
		items={options}
		{selectedIndex}
		containerClass="itemsContainer"
		onItemEvent={onSelect}
		{itemID}
		{getItemTooltip}>
		<svelte:fragment slot="item" let:item={option}>
			<slot name="option" {option}>Implement "item" slot to customize item rendering.</slot>
		</svelte:fragment>
		<svelte:fragment slot="empty">
			<slot name="empty"></slot>
		</svelte:fragment>
	</ScrollingItemList>
</main>

<style lang="scss">
main {
	font-size: 120%;
}

.inputContainer {
	display: flex;
	position: relative;
	margin-bottom: 1rem;
}

input {
	flex-grow: 1;
}

.placeholder {
	position: absolute;
	left: 2rem;
	top: 0;
	bottom: 0;

	color: var(--deemphasizedTextColor);
	font-style: italic;
	font-size: 90%;

	display: flex;
	flex-direction: column;
	justify-content: center;

	pointer-events: none;
}

main :global(.itemsContainer) {
	max-height: 40rem;
}
</style>