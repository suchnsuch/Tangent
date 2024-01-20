<script lang="ts">
import { createEventDispatcher, onDestroy } from 'svelte';
import type WorkspaceTreeNode from 'app/model/WorkspaceTreeNode';
import OneLineEditor from 'app/views/editors/OneLineEditor/OneLineEditor';
import asRoot from 'typewriter-editor/lib/asRoot';
import { Source } from 'typewriter-editor';
import { wait } from '@such-n-such/core';

const dispatch = createEventDispatcher<{
	'rename': string,
	'enter-exit': void
}>()

// Using an editor here to have full control over paste behavior.
const editor = new OneLineEditor();
editor.on('root', bindEditor)

onDestroy(() => {
	editor.off('root', bindEditor)
	unbindEditor()
})

export let headerElement: HTMLElement = null
export let headerEditElement: HTMLElement = null
export let editable = true
export let focusing = false

export let preventMouseUpDefault = false
export let showExtension = true

export let node: WorkspaceTreeNode
$: updateText(node ? $node.name : '')
$: editor.enabled = editable

function updateText(text: string) {
	if (headerEditElement && document.activeElement === headerEditElement) {
		return
	}
	editor.setText(text, undefined, Source.api)
}

function bindEditor() {
	const root = editor.root
	root.addEventListener('shortcut', onHeaderKeydown)
}
function unbindEditor() {
	const root = editor.root
	root.removeEventListener('shortcut', onHeaderKeydown)
}

function mouseUp(event: MouseEvent) {
	if (preventMouseUpDefault) {
		event.preventDefault()
	}
}

function headerMouseUp(event: MouseEvent) {
	mouseUp(event)
	if (document.activeElement !== headerEditElement) {
		document.getSelection().selectAllChildren(headerEditElement)
		headerEditElement.focus()
	}
}

function renameFile() {
	// Trim to remove any trailing newline from the editor
	let newName = editor.getText().trim()
	if (node.name !== newName) {
		if (!dispatch('rename', newName, { cancelable: true }) || !node.rename(newName)) {
			wait().then(() => {
				editor.setText(node ? $node.name : '', undefined, Source.api)
			})
		}
	}
}

function onHeaderKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		event.preventDefault()
		headerEditElement.blur()

		dispatch('enter-exit')
	}
	else if (event.key === 'Escape') {
		event.preventDefault()
		const name = node ? $node.name : ''
		editor.setText(name, [0, name.length], Source.api)
	}
}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<header
	class:focusing
	on:mouseup={headerMouseUp}
	bind:this={headerElement}
><span
	class="title"
	bind:this={headerEditElement}
	use:asRoot={editor}
	on:mouseup={mouseUp}
	on:blur={renameFile}
	></span>{#if showExtension}<span class="extension"
	>{$node.fileType}</span>{/if}
</header>


<style lang="scss">
header {
	white-space: pre-wrap;
	word-wrap: break-word;

	max-width: var(--noteWidthMax);
	box-sizing: border-box;
	margin: 0 auto;

	font-family: var(--noteFontFamily);
	padding: calc(1.5em / 2.5) calc(2em / 2.5);
	font-size: calc(var(--fontSize) * 2.5);
	font-weight: 500;
	padding-bottom: calc(1em / 2.5);

	transition: opacity .3s;
	&.focusing {
		opacity: .5;
	}

	.title:focus {
		outline: none;
	}
}

.title :global(br) {
	content: "";
	display: none;
}

:global(.margins-tight) header {
	padding: calc(.5em / 2.5) calc(.5em / 2.5) 0;
}

:global(.margins-relaxed) header {
	padding: calc(3em / 2.5) calc(3em / 2.5);
}

.extension {
	color: var(--deemphasizedTextColor);
}

</style>