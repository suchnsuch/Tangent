<script lang="ts">
import { getContext } from 'svelte'
import { HrefFormedLink } from 'common/indexing/indexTypes'
import { TreeNode } from 'common/trees'
import { isMac } from 'common/isMac'
import { Workspace } from 'app/model'
import { HandleResult } from 'app/model/NodeHandle'
import type { LinkState } from './NoteEditor/t-link'
import NodePreview from '../summaries/NodePreview.svelte'
import NodeLine from '../summaries/NodeLine.svelte'

const workspace = getContext('workspace') as Workspace

const linkFollow = workspace.settings.noteLinkFollowBehavior
const linkPane = workspace.settings.linkClickPaneBehavior

export let link: HrefFormedLink
export let state: LinkState
export let context: HandleResult

$:node = (context != null && !Array.isArray(context)) ? context as TreeNode : null
$:nodes = (context != null && Array.isArray(context)) ? context as TreeNode[] : null

function getClickPrefix() {
	if ($linkFollow === 'mod') {
		return isMac ? '⌘+' : 'Ctrl+'
	}
	return ''
}

function getLinkPane(flip=false) {
	if (($linkPane === 'new') !== flip) {
		return 'a new pane'
	}
	else {
		return 'this pane'
	}
}

function getClickMessage(name='', location: string = null) {
	let result = getClickPrefix() + 'Click'
	result += ' or Middle-Click to open '
	if (name) {
		result += name + ' '
	}

	if (location === null) {
		if ($linkPane === 'new') {
			location = 'in a new pane.'
		}
		else {
			location = 'in this pane.'
		}
	}

	result += location
	return result
}

</script>

<main>
	{#if state === 'resolved' || state === 'empty'}
		{#if node}
			<div class="preview margins-tight">
				<NodePreview item={node} layout='auto' />
			</div>
			<p class="action">
				{getClickPrefix()}Click or Middle-Click to open in {getLinkPane()}.
			</p>
			<p class="action">
				{getClickPrefix()}Shift+Click to open in {getLinkPane(true)}.
			</p>
			<p class="action">
				{getClickPrefix()}{isMac ? '⌥' : 'Alt'}+Click to open in a new pane to the left.
			</p>
		{/if}
	{:else if state === 'external' || state === 'untracked'}
		<p>
			{link.href}
		</p>
		<p class="action">
			{getClickPrefix()}Click or Middle-Click to open in your default browser.
		</p>
	{:else if state === 'ambiguous'}
		<p>The link "{link.href}" is ambiguious between:</p>
		<ul style:font-size="120%">
			{#each nodes as n}
				<li><NodeLine node={n} showFileType={true}/></li>
			{/each}
		</ul>
		<p>Include parent folders in the link to identify the intended target.</p>
	{:else if state === 'error'}
		Something went wrong resolving this link.
	{/if}
</main>

<style lang="scss">
.preview {
	max-height: 20em;

	--fontSize: calc(var(--noteFontSize) * .8);
	--headerFontSizeFactor: 2.25;

	overflow: hidden;
	margin-bottom: 1em;

	:global(.imageCard .image) {
		border-radius: var(--borderRadius);
	}
}

.action {
	color: var(--deemphasizedTextColor);
	margin-bottom: 0;
}
</style>
