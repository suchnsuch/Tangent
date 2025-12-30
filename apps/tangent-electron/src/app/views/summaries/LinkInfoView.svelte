<script lang="ts">
import { createEventDispatcher, getContext } from 'svelte'
import { asRoot } from 'typewriter-editor'

import type { ConnectionInfo } from 'common/indexing/indexTypes'
import paths from 'common/paths'

import type { Workspace } from 'app/model'
import MarkdownView from '../editors/NoteEditor/MarkdownView'
import { markdownToTextDocument } from 'common/markdownModel'
import { writable } from 'svelte/store'
import { appendContextTemplate } from 'app/model/menus'

let workspace: Workspace = getContext('workspace')

const dispatch = createEventDispatcher()

export let link: ConnectionInfo
export let target: 'to' | 'from'
export let className = ''

$: targetPath = target === 'to' ? link.to : link.from
$: targetNode = workspace.directoryStore.get(targetPath)

const contextStore = writable(link?.context || '')
const editor = new MarkdownView({ doc: markdownToTextDocument($contextStore) })

$: contextStore.set(link?.context || '')
$: editor.set(markdownToTextDocument($contextStore))

function onKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented) return
	if (event.key === 'Enter') {
		event.preventDefault()
		sendSelection(event.altKey)
	}
}

function onClick(event: MouseEvent) {
	event.preventDefault()
	sendSelection(event.altKey)
}

function sendSelection(sendIn: boolean) {
	dispatch('select', {
		direction: sendIn ? 'in' : 'out'
	})
}

function onContextMenu(event: MouseEvent) {
	appendContextTemplate(event, [
		{
			label: 'Open to right',
			accelerator: 'Enter',
			click: () => {
				sendSelection(false)
			}
		},
		{
			label: 'Open to left',
			accelerator: 'Alt+Enter',
			click: () => {
				sendSelection(true)
			}
		}
	])
}

</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<main
	class={className}
	tabindex="0"
	on:click={onClick}
	on:keydown={onKeydown}
	on:contextmenu={onContextMenu}
>
	<h1>{targetNode?.name || paths.basename(targetPath)}</h1>
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
	margin-top: .5em;
	margin-bottom: 0;
	padding: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
