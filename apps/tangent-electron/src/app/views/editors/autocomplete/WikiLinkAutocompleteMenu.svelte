<script lang="ts">
import NodeLine from '../../summaries/NodeLine.svelte'

import type WikiLinkAutocompleter from "./WikiLinkAutocompleter"
import SearchSegmentHighlight from 'app/utils/SearchSegmentHighlight.svelte'
import ScrollingItemList from 'app/utils/ScrollingItemList.svelte'
import { showFileType } from './WikiLinkAutocompleter';
import SvgIcon from 'app/views/smart-icons/SVGIcon.svelte';
import { noteIcon } from 'common/icons';

export let handler: WikiLinkAutocompleter

$: isEmbed = handler.isEmbed
$: mode = handler.mode

$: pathText = handler.pathText
$: nodeOptions = handler.nodeOptions
$: selectedNode = handler.selectedNode
$: selectedNodeIndex = $nodeOptions.indexOf($selectedNode)

$: contentText = handler.contentText
$: contentOptions = handler.contentOptions
$: selectedContent = handler.selectedContent
$: selectedContentIndex = $contentOptions.findIndex(i => i.header === $selectedContent)


function nodeOptionEvent(option: any, event: Event) {
	if (event.type === 'click') {
		if ($mode === 'node') {
			handler.selectedNodeIndex = $nodeOptions.indexOf(option)
		}
		else if ($mode === 'content') {
			handler.selectedContentIndex = $contentOptions.indexOf(option)
		}
		handler.applySelection()
		handler.end()
	}
}
</script>

<div class="autocomplete-window">
	{#if $mode === 'node'}
		<ScrollingItemList
			items={$nodeOptions}
			selectedIndex={selectedNodeIndex}
			containerClass="options"
			itemClass="option wikilink"
			onItemEvent={nodeOptionEvent}>
			<svelte:fragment slot="item" let:item={option}>
				{#if option.node}
					<NodeLine node={option.node} showFileType={showFileType(option.node.fileType)} nameMatch={option.match} />
				{:else if $pathText}
					{#if $isEmbed}
						Nothing found to embed.
					{:else}
						<!-- Create a fake node line -->
						<div style="display: flex; align-items: center; gap: .4em;">
							<SvgIcon ref={noteIcon} size="1em" />
							<span>Create link to new note "{$pathText}"...</span>
						</div>
					{/if}
				{/if}
			</svelte:fragment>
			<svelte:fragment slot="empty">
				<div class="option placeholder">Type to link to file...</div>
			</svelte:fragment>
		</ScrollingItemList>
	{:else if $mode === 'content'}
		<ScrollingItemList
			items={$contentOptions}
			selectedIndex={selectedContentIndex}
			containerClass="options"
			itemClass="option wikilink"
			onItemEvent={nodeOptionEvent}>
			<svelte:fragment slot="item" let:item={option}>
				<span class="headerLevel">H{option.header.level}</span>
				<span class="headerText"><SearchSegmentHighlight value={option.match ?? option.header.text} /></span>
			</svelte:fragment>
			<svelte:fragment slot="empty">
				{#if $contentText}
					<div class="option selected">No matching header found.</div>
				{:else}
					<div class="option placeholder">Type search for header...</div>
				{/if}
			</svelte:fragment>
		</ScrollingItemList>
	{/if}
	

	<div class="instructions">
		{#if $isEmbed}
			{#if $mode === 'text'}
				<div>"<code>100</code>" will set the width and retain the aspect ratio.</div>
				<div>"<code>100x100</code>" will set the width and height.</div>
			{:else}
				<div>Type <span class="key">|</span> to customize the embed options.</div>
			{/if}
		{:else}
			{#if $mode === 'node' && handler.options.enableContent}
				<div>Type <span class="key">#</span> to link to a header.</div>
			{/if}

			{#if $mode === 'text'}
				<div>Type what the link will be displayed as.</div>
				<div>Type <span class="key">|</span> to select all customized text.</div>
			{:else if handler.options.enableText}
				<div>Type <span class="key">|</span> to customize link text.</div>
			{/if}
		{/if}
		{#if handler.options.enableEmbedding}
			<div>
				Type <span class="key">!</span> to
				{#if $isEmbed}
					switch to linking.
				{:else}
					switch to embedding.
				{/if}
			</div>
		{/if}
	</div>
</div>
