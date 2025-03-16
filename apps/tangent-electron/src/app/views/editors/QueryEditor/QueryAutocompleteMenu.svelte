<script lang="ts">
import type QueryAutocompleter from './QueryAutocompleter'

import ScrollingItemList from 'app/utils/ScrollingItemList.svelte'
import SearchSegmentHighlight from 'app/utils/SearchSegmentHighlight.svelte'
import { tooltip } from 'app/utils/tooltips'

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
			<div use:tooltip={item.tooltip}>
				{#if item.label}
					{item.label}
				{:else}
					<SearchSegmentHighlight value={item.match ?? item.text} />
				{/if}
			</div>
		</svelte:fragment>
	</ScrollingItemList>
</div>
