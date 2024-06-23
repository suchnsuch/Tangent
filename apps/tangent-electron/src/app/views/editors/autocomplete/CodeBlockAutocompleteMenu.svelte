<script lang="ts">
import ScrollingItemList from 'app/utils/ScrollingItemList.svelte'
import CodeBlockAutocompleter from './CodeBlockAutoCompleter'
import SearchSegmentHighlight from 'app/utils/SearchSegmentHighlight.svelte'

export let handler: CodeBlockAutocompleter

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
			<SearchSegmentHighlight value={item.match ?? item.language} />
		</svelte:fragment>
	</ScrollingItemList>
</div>
