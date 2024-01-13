<script lang="ts">
import ScrollingItemList from 'app/utils/ScrollingItemList.svelte'
import { shortcutsHtmlString } from 'app/utils/shortcuts'
import TagAutocompleteItem from './TagAutocompleteItem.svelte'
import type { TagOption } from './TagAutocompleter'
import type TagAutocompleter from './TagAutocompleter'

export let handler: TagAutocompleter

$: options = handler.tagOptions
$: selectedIndex = handler.selectedTagIndex
$: text = handler.text

function tagOptionEvent(option: TagOption, event: Event) {
	if (event.type == 'click') {
		handler.setSelection(option)
		handler.applyAndFullExit()
	}
}

</script>

<div class="autocomplete-window">
	<ScrollingItemList
		items={$options}
		selectedIndex={$selectedIndex}
		onItemEvent={tagOptionEvent}
	>
		<svelte:fragment slot="item" let:item={option}>
			<TagAutocompleteItem {option} seperator={handler.seperatorChar} />
		</svelte:fragment>
		<svelte:fragment slot="empty">
			<div class="option selected">Create new tag "{$text.substring(1)}"</div>
		</svelte:fragment>
	</ScrollingItemList>

	<div class="instructions">
		<div>
			Type
			<span class="key">.</span> or <span class="key">/</span>
			to accept the current sub-name
		</div>
		<div>
			Press
			<span class="shortcut">{@html shortcutsHtmlString('Mod+\\')}</span>
			to disable the tag with a backslash.
		</div>
	</div>
</div>
