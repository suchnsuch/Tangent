<script lang="ts">
import { createEventDispatcher, onDestroy } from 'svelte'
import { asRoot } from 'typewriter-editor'
import { markdownToTextDocument } from 'common/markdownModel'

import type { NavigationData } from 'app/events'
import MarkdownView from './MarkdownView'
import type { NavigationEvent } from '../t-linkModule';

const dispatch = createEventDispatcher<{
	'navigate': NavigationData
}>()

export let content: string
const editor = new MarkdownView({ doc: markdownToTextDocument(content ?? '')} )

editor.on('navigate', navigationForward)

onDestroy(() => {
	if (editor) {
		editor.off('navigate', navigationForward)

		editor.destroy()
	}
})

function navigationForward(event: NavigationEvent) {
	const link = event.link
	if (!link.href && link.content_id) {
		// TODO: Handle internal link highlighting
		// Internal link
		//$linkHighlight = link
	}
	else {
		dispatch('navigate', {
			link
		})
	}
}

</script>

<article class="note no-mod-link-click" use:asRoot={editor}></article>