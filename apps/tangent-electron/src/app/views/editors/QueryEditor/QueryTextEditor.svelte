<script lang="ts">
import type { QueryError, QueryParseResult } from '@such-n-such/tangent-query-parser'
import type { Workspace } from 'app/model';
import type { QueryResult } from 'common/indexing/queryResults'
import { getContext, onDestroy } from 'svelte';
import QueryEditor from './QueryEditor';
import { Source, type EditorChangeEvent, type ShortcutEvent, asRoot, EditorRange } from 'typewriter-editor'
import './query.scss'
import AutoCompleteMenu from '../autocomplete/AutoCompleteMenu.svelte'
import WikiLinkAutocompleter from '../autocomplete/WikiLinkAutocompleter'
import WikiLinkAutocompleteMenu from '../autocomplete/WikiLinkAutocompleteMenu.svelte'
import QueryAutocompleteMenu from './QueryAutocompleteMenu.svelte'
import QueryAutocompleter from './QueryAutocompleter'
import TagAutocompleter from '../autocomplete/TagAutocompleter'
import TagAutocompleteMenu from '../autocomplete/TagAutocompleteMenu.svelte'
    import { getInitialQuerySelection } from 'common/queryModel';

const workspace = getContext('workspace') as Workspace

const editor = new QueryEditor(workspace)

export let text: string
export let result: QueryResult
export let isDirty = false

editor.on('root', onEditorRoot)
editor.on('change', onEditorChanged)

function onEditorRoot() {
	updateQueryResult(result?.query as QueryParseResult)
	editor.root.addEventListener('shortcut', onKeyDown)
}

onDestroy(() => {
	editor.off('root', onEditorRoot)
	editor.off('change', onEditorChanged)
	editor.root.removeEventListener('shortcut', onKeyDown)
})

$: editor.setText(text, getInitialQuerySelection(text, editor.doc.selection), Source.api)
$: updateQueryResult(result?.query as QueryParseResult)
$: allErrors = collectErrors(result)

function updateQueryResult(result: QueryParseResult) {
	editor.modules.query?.updateQueryResult(result)
}

function onEditorChanged(event: EditorChangeEvent) {
	if (event.change && event.change.delta.length() && event.changedLines?.length) {
		isDirty = true
		const editorText = event.doc.getText()
		workspace.api.query.parseQuery(editorText).then(updateQueryResult)
	}
}

function onKeyDown(event: ShortcutEvent) {
	if (event.defaultPrevented) return

	switch (event.modShortcut) {
		case 'Enter':
			event.preventDefault()
			return submitQuery()
	}
}

function collectErrors(result: QueryResult) {
	const errors: QueryError[] = []

	if (result) {
		if (result.errors) {
			errors.push(...result.errors)
		}

		if ('errors' in result.query) {
			if (result.query.errors) {
				errors.push(...result.query.errors)
			}
		}
	}

	return errors
}

function submitQuery() {
	isDirty = false
	text = editor.getText()
}

</script>

<main class="QueryEditor">
	<div class="container">
		<slot name="label">
			<header>Query:</header>
		</slot>
		<article
			use:asRoot={editor}
			spellcheck="false"
			on:blur={submitQuery}
		></article>
		<AutoCompleteMenu {editor} offset={4} let:handler>
			{#if handler instanceof WikiLinkAutocompleter}
				<WikiLinkAutocompleteMenu {handler} />
			{:else if handler instanceof QueryAutocompleter}
				<QueryAutocompleteMenu {handler} />
			{:else if handler instanceof TagAutocompleter}
				<TagAutocompleteMenu {handler} />
			{/if}
		</AutoCompleteMenu>
	</div>
</main>

<style lang="scss">
main {
	flex-grow: 1;
}
.container {
	display: flex;
	align-items: center;
	background: var(--noteBackgroundColor);
	margin-right: 1em;
	padding: .5em;
	border-radius: var(--inputBorderRadius);
}
header {
	color: var(--deemphasizedTextColor);
}
article {
	flex-grow: 1;
}
</style>