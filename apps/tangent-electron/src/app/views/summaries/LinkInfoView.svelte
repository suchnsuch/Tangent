<script lang="ts">
import { getContext } from 'svelte'
import { asRoot, Source } from 'typewriter-editor'

import type { ConnectionInfo } from 'common/indexing/indexTypes'
import paths from 'common/paths'

import type { Workspace } from 'app/model'
import MarkdownView from '../editors/NoteEditor/MarkdownView'
import { markdownToTextDocument } from 'common/markdownModel'
import { appendContextTemplate } from 'app/model/menus'

let workspace: Workspace = getContext('workspace')

let {
	link,
	target,

	className = '',
	showHeader = true,

	onSelect,
} : {
	link: ConnectionInfo
	target: 'to' | 'from'
	
	className: string
	showHeader?: boolean

	onSelect: (event: KeyboardEvent|MouseEvent) => void
} = $props()

let targetPath = $derived(target === 'to' ? link.to : link.from)
let targetNode = $derived(workspace.directoryStore.get(targetPath))
let contextText = $derived(link?.context || '')

const editor = new MarkdownView({
	workspace: workspace
})

$effect(() => {
	editor.modules.tangent?.setNotePath(targetNode?.path)
	editor.set(markdownToTextDocument(contextText, {
		filepath: targetNode?.path
	}), Source.api)
})

function onKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented || event.key !== 'Enter') return
	onSelect(event)
}

function onContextMenu(event: MouseEvent) {
	appendContextTemplate(event, [
		{
			label: 'Open to right',
			accelerator: 'Enter',
			click: () => {
				onSelect(new MouseEvent('click'))
			}
		},
		{
			label: 'Open to left',
			accelerator: 'Alt+Enter',
			click: () => {
				onSelect(new MouseEvent('click', {
					altKey: true
				}))
			}
		}
	])
}

</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main
	class={className}
	tabindex="0"
	onclick={onSelect}
	onkeydown={onKeydown}
	oncontextmenu={onContextMenu}
>
	{#if showHeader}<h1>{targetNode?.name || paths.basename(targetPath)}</h1>{/if}
	{#if editor}
		<article class="note" use:asRoot={editor}></article>
	{:else if link.context}
		<article>
			…{link.context}…
		</article>
	{/if}
</main>

<style lang="scss">
main {
	position: relative;
	padding: .75em;
	border-radius: var(--inputBorderRadius);
	background-color: var(--backgroundColor);
	display: flex;
	flex-direction: column;

	--fontSize: calc(var(--fontSize) * .8);
}

h1 {
	font-size: 1em;
	margin: 0;
}

article.note {
	font-size: 80%;
	margin-bottom: 0;
	padding: 0;
	overflow: hidden;
	text-overflow: ellipsis;

	&:not(:first-child) {
		margin-top: .5em;
	}
}
</style>
