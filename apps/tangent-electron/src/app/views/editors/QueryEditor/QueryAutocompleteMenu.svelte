<script lang="ts">
import type QueryAutocompleter from './QueryAutocompleter'

import ScrollingItemList from 'app/utils/ScrollingItemList.svelte'
import SearchSegmentHighlight from 'app/utils/SearchSegmentHighlight.svelte'
import { KEYWORD } from '@such-n-such/tangent-query-parser'

export let handler: QueryAutocompleter

$: list = handler.expects
$: selectedIndex = handler.selectedItemIndex

function nodeOptionEvent(option: any, event: Event) {
	if (event.type === 'click') {
		handler.selectedItemIndex.set($list.indexOf(option))
		handler.autocomplete.updateAutocomplete(handler.getCurrentOptionText())
		handler.autocomplete.endAutocomplete()
	}
}
</script>

<div class="autocomplete-window">
	<ScrollingItemList
		items={$list}
		selectedIndex={$selectedIndex}
		containerClass="options"
		itemClass="option wikilink"
		onItemEvent={nodeOptionEvent}
	>
		<svelte:fragment slot="item" let:item>
			{#if item.text === ''}
				{#if item.key === KEYWORD.VALUE.STRING_DOUBLE}
					"Exact Text"
				{:else if item.key === KEYWORD.VALUE.STRING_SINGLE}
					'Fuzzy Text'
				{:else if item.key === KEYWORD.VALUE.REGEX}
					/Regex/
				{:else if item.key === KEYWORD.VALUE.WIKI}
					[[Wiki Reference]]
				{:else if item.key === KEYWORD.VALUE.TAG}
					#tag
				{:else if item.key === KEYWORD.VALUE.SUBQUERY}
					&lbrace;Subquery&rbrace;
				{:else}
					Unhandled Key: {item.key}
				{/if}
			{:else}
				<SearchSegmentHighlight value={item.match ?? item.text} />
			{/if}
		</svelte:fragment>
	</ScrollingItemList>
</div>
