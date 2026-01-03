<script lang="ts">
import { getContext, onDestroy } from 'svelte';
import type WorkspaceTreeNode from 'app/model/WorkspaceTreeNode';
import OneLineEditor from 'app/views/editors/OneLineEditor/OneLineEditor';
import { Source, asRoot } from 'typewriter-editor';
import { wait } from '@such-n-such/core';
import NodeIcon from 'app/views/smart-icons/NodeIcon.svelte';
import AutoCompleteMenu from 'app/views/editors/autocomplete/AutoCompleteMenu.svelte';
import UnicodeAutocompleter from 'app/views/editors/autocomplete/UnicodeAutocompleter';
import UnicodeAutocompleteMenu from 'app/views/editors/autocomplete/UnicodeAutocompleteMenu.svelte';

// Using an editor here to have full control over paste behavior.
const editor = new OneLineEditor(getContext('workspace'));
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
export let showIcon = true
export let showExtension = true

export let onRename: (newName: string) => boolean|undefined = null
export let onEnterExit: () => void = null

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
		editor.select([0, editor.doc.length - 1])
	}
}

function renameFile() {
	// Trim to remove any trailing newline from the editor
	let newName = editor.getText().trim()
	if (node.name !== newName) {
		if (onRename && onRename(newName) === false || !node.rename(newName)) {
			wait().then(() => {
				editor.setText(node ? $node.name : '', undefined, Source.api)
			})
		}
	}
}

function onHeaderKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented) return

	if (event.key === 'Enter') {
		event.preventDefault()
		headerEditElement.blur()

		if (onEnterExit) onEnterExit()
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
>{#if showIcon}<span class="icon"><NodeIcon {node} size="1em" /></span>{/if}<span
	class="title"
	bind:this={headerEditElement}
	use:asRoot={editor}
	on:mouseup={mouseUp}
	on:blur={renameFile}
	></span>{#if showExtension}<span class="extension"
	>{$node.fileType}</span>{/if}
</header>
<AutoCompleteMenu {editor} offset={4} let:handler>
	{#if handler instanceof UnicodeAutocompleter}
		<UnicodeAutocompleteMenu {handler} />
	{/if}
</AutoCompleteMenu>


<style lang="scss">
header {
	white-space: pre-wrap;
	word-wrap: break-word;

	max-width: var(--noteWidthMax);
	box-sizing: border-box;
	margin: 0 auto;

	font-family: var(--noteFontFamily);
	padding: calc(1.5em / 2.5) calc(2em / 2.5);
	font-size: calc(var(--fontSize) * var(--headerFontSizeFactor));
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
	padding: calc(.5em / 2.5) calc(.5em / 2.5);
}

:global(.margins-relaxed) header {
	padding: calc(3em / 2.5) calc(3em / 2.5);
}

:global(.lens-settings-row) > header {
	margin: 0;
	padding: .25em 0;
	font-size: 200%;
	flex-grow: 1;
}

.icon {
	position: relative;
	top: .125em;
	padding-right: .25em;
}

.extension {
	color: var(--deemphasizedTextColor);
}

</style>