<script lang="ts">
import { getContext } from 'svelte'
import { HrefFormedLink } from 'common/indexing/indexTypes'
import { TreeNode } from 'common/trees'
import { isMac } from 'common/platform'
import { Workspace } from 'app/model'
import { dropTooltip } from 'app/utils/tooltips'
import type { LinkState } from './NoteEditor/t-link'
import type TangentLink from './NoteEditor/t-link'
import NodePreview from '../summaries/NodePreview.svelte'
import NodeLine from '../summaries/NodeLine.svelte'
import { isNode } from 'app/model/NodeHandle'

const workspace = getContext('workspace') as Workspace

const linkFollow = workspace.settings.noteLinkFollowBehavior
const linkPane = workspace.settings.linkClickPaneBehavior

export let origin: TangentLink
export let link: HrefFormedLink
export let state: LinkState
export let errorMessage: string

$: context = workspace.getHandle(link)
$:node = ($context != null && !Array.isArray($context) && typeof $context !== 'string' && isNode($context)) ? $context as TreeNode : null
$:nodes = ($context != null && Array.isArray($context)) ? $context as TreeNode[] : null

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

function onClick(event: MouseEvent) {
	const newEvent = new MouseEvent('click', event)
	origin.onClick(newEvent)
	;(newEvent as any).tNavigationOverride = true
	origin.dispatchEvent(newEvent)

	dropTooltip(origin, false)
}

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<main
	on:click={onClick}
>
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
		<p class="external">
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
		<p>Something went wrong resolving this link.</p>
		{#if errorMessage}
			<p>{@html errorMessage}</p>
		{/if}
	{/if}
</main>

<style lang="scss">
.preview {
	max-height: 20em;

	--fontSize: calc(var(--noteFontSize) * .8);
	--headerFontSizeFactor: 2.25;

	overflow-x: hidden;
	overflow-y: auto;
	margin-bottom: 1em;

	:global(*) {
		pointer-events: none;
	}
}

.external {
	word-wrap: break-word;
}

.action {
	color: var(--deemphasizedTextColor);
	margin-bottom: 0;
	padding-right: 1.5em;
}
</style>
