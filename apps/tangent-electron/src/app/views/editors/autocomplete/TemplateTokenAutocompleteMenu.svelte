<script lang="ts">
import ScrollingItemList from "app/utils/ScrollingItemList.svelte"
import type TemplateTokenAutocompleter from "./TemplateTokenAutocompleter"

let {
	handler
}: {
	handler: TemplateTokenAutocompleter
} = $props()

let items = $derived(handler.options)
let selectedItem = $derived(handler.selectedOption)
let selectedItemIndex = $derived($items.indexOf($selectedItem))

function nodeOptionEvent(option: any, event: Event) {
	if (event.type === 'click') {
		handler.selectedOption.set(option)
		handler.applySelection()
		handler.autocomplete.endAutocomplete()
	}
}

</script>

<div class="autocomplete-window">
	<h1>Templating Tokens</h1>
	<ScrollingItemList
		items={$items}
		selectedIndex={selectedItemIndex}
		onItemEvent={nodeOptionEvent}
	>
		<svelte:fragment slot="item" let:item={item}>
			<div><code>{item.text}</code></div>
			<div class="description">{item.description}</div>
		</svelte:fragment>
	</ScrollingItemList>
</div>

<style lang="scss">
h1 {
	font-size: 120%;
	margin: 0;
	margin-bottom: 0.5em;
}
.description {
	color: var(--deemphasizedTextColor);
	font-size: 80%;
	margin-inline-start: 1em;
}
</style>
