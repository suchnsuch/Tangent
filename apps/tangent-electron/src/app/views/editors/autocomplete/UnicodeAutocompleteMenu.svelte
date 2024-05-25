<script lang="ts">
import ScrollingItemList from 'app/utils/ScrollingItemList.svelte'
import UnicodeAutocompleter from './UnicodeAutocompleter'

export let handler: UnicodeAutocompleter

$: items = handler.options
$: selectedItem = handler.selectedOption
$: selectedItemIndex = $items.indexOf($selectedItem)

function nodeOptionEvent(option: any, event: Event) {
	if (event.type === 'click') {
		handler.selectedOption.set(option)
		handler.applySelection()
		handler.autocomplete.endAutocomplete()
	}
}
</script>

<div class="autocomplete-window">
	<ScrollingItemList
		items={$items}
		selectedIndex={selectedItemIndex}
		onItemEvent={nodeOptionEvent}
	>
		<svelte:fragment slot="item" let:item={item}>

		</svelte:fragment>
	</ScrollingItemList>
</div>
