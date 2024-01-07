<script lang="ts">
import type QueryViewState from 'app/model/nodeViewStates/QueryViewState'
import QueryTextEditor from '../editors/QueryEditor/QueryTextEditor.svelte'
import SetLensSelector from './common/SetLensSelector.svelte'
import DocumentationLink from 'app/utils/DocumentationLink.svelte'
import { pluralize } from 'common/plurals';
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte';
import { getContext } from 'svelte';
import type { Workspace } from 'app/model';
import paths from 'common/paths';
import { validateFileSegment } from 'common/trees'

const workspace = getContext("workspace") as Workspace

export let state: QueryViewState

let isQueryDirty = false

$: info = state.queryInfo
$: queryString = $info.queryString
$: queryResult = state.queryResult
$: lastRequestedID = state.lastRequestID
$: lastReceivedID = state.lastReceivedID

$: isLoadingQuery = $lastRequestedID !== $lastReceivedID

$: hasErrors = $queryResult && (
	($queryResult.errors?.length) ||
	('errors' in $queryResult.query && $queryResult.query.errors?.length)
)

function onRename(event: CustomEvent<string>) {
	const parent = workspace.directoryStore.getParent(state.node)
	const grandparent = workspace.directoryStore.getParent(parent)
	if (parent && grandparent) {
		if (parent.name === 'Temp' && grandparent.name === '.tangent') {
			event.preventDefault()
			const validatedName = validateFileSegment(event.detail)
			if (!validatedName) return
			const newPath = paths.join(workspace.directoryStore.files.path, event.detail) + state.node.fileType
			workspace.api.move(state.node.path, newPath)
		}
	}
}

</script>

<div class="lens-settings-row">
	<QueryTextEditor bind:text={$queryString} result={$queryResult} bind:isDirty={isQueryDirty}>
		<WorkspaceFileHeader
			slot="label"
			node={state.node} showExtension={false}
			on:rename={onRename}
		/>
	</QueryTextEditor>
	<DocumentationLink pageName="Queries" />
</div>
<div class="lens-settings-row result-description">
	{#if isLoadingQuery}
		Running query...
	{:else if $queryResult && $queryResult.items?.length}
		{#if isQueryDirty}
			Results out of date. Press Return to search.
		{:else}
			{@const itemCount = $queryResult.items.length}
			Found {itemCount} {pluralize(itemCount, 'items', 'item')}
		{/if}
	{:else if !$queryString}
		Empty query string. Please input a valid query.
	{:else if hasErrors}
		Nothing found. Please fix any errors in the query.
	{:else}
		Nothing found
	{/if}
</div>

<div class="lens-settings-row">
	<SetLensSelector info={$info} />
	<slot></slot>
</div>

<style lang="scss">
.result-description {
	font-size: 90%;
	color: var(--deemphasizedTextColor);
	padding: .1rem .5rem .5rem;
}
.lens-settings-row {
	:global(.QueryEditor) {
		:global(header) {
			font-size: unset;
			padding: unset;
			color: var(--deemphasizedTextColor);

			:global(.title) {
				&:empty {
					width: 50px;
				}
				&::after {
					content: ":";
					color: var(--deemphasizedTextColor);
				}
			}
		}
	}
}
</style>
