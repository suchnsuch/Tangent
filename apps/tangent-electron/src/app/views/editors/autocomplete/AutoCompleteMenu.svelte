<script lang="ts">
import { readable } from 'svelte/store'
import { createPopper } from '@popperjs/core';

import { Editor, EditorRange, proxy } from "typewriter-editor";
import { editorStores } from 'typewriter-editor/lib/stores'
import { OFFSCREEN_RECT } from 'typewriter-editor/lib/popper'

import type { AutocompleteHandler, AutocompleteModule } from './autocompleteModule'

import './autocomplete.scss'

export let editor: Editor

export let offset = 0
export let padding = 4

let menu: HTMLElement
let popper;

const { active, doc, selection, focus, root, updateEditor } = editorStores(editor);
$: updateEditor(editor);

let activeHandler = proxy(readable(null as AutocompleteHandler, () => {}))
let activeRange = proxy(readable(null as EditorRange, () => {}))

$: update(menu, $activeHandler, $activeRange)

editor.on('root', () => {
	const mod = editor.modules.autocomplete as AutocompleteModule
	activeHandler.set(mod.activeHandler)
	activeRange.set(mod.range)
})

function update(_m, _h, _r) {
	if (menu) {
		if (popper) {
			popper.update()
		}
		else {
			const element = {
				getBoundingClientRect: () => editor.getBounds($activeRange) || OFFSCREEN_RECT,
				contextElement: editor.root
			}
			popper = createPopper(element as any, menu, {
				placement: 'bottom-start',
				modifiers: [
					{ name: 'offset', options: { offset: [0, offset] }},
          			{ name: 'preventOverflow', options: { padding }},
				]
			})
		}
	}
	else if (popper) {
		popper.destroy()
		popper = null
	}
}
</script>

{#if $activeHandler}
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div bind:this={menu}>
	<slot handler={$activeHandler}></slot>
</div>
{/if}

<style>
div {
	z-index: 1000;
}
</style>
