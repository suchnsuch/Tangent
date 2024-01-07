<script lang="ts">
import { getContext } from 'svelte'
import { iterateOverChildren, type TreeNode } from 'common/trees'
import { PathMatch, SegmentSearchNodePair, buildMatcher, orderTreeNodesForSearch } from 'common/search'
import { implicitExtensionsMatch } from 'common/fileExtensions'
import type Workspace from '../model/Workspace'

import ModalInputSelect from './ModalInputSelect.svelte'
import NodeLine from '../views/summaries/NodeLine.svelte'

let workspace = getContext('workspace') as Workspace

export let subject: TreeNode
$: parent = workspace.directoryStore.getParent(subject)

let text: string = ''
let options: SegmentSearchNodePair[] = []
let selectedIndex = 0
$: updateOptions(text)
function updateOptions(text: string) {

	const nodeFilter = (node: TreeNode) => {
		return node.fileType === 'folder' && !node.name.startsWith('.')
	}

	let nodes: SegmentSearchNodePair[] = null
	let pathMatch: PathMatch = null
	if (text) {
		pathMatch = buildMatcher(text, { fuzzy: true })
		nodes = workspace.directoryStore.getMatchesForPath(pathMatch, {
			alwaysReturnArray: true,
			includeMatches: 'best',
			fuzzy: true,
			filter: nodeFilter
		})
	}
	else {
		nodes = [...iterateOverChildren(workspace.directoryStore.files, nodeFilter)].map(node => ({
			node, match: undefined
		}))
	}
	nodes.sort((a, b) => orderTreeNodesForSearch(a, b))
	if (!text) {
		nodes = nodes.slice(0, 16)
	}

	if (nodes.length == 0 || 'workspace root'.includes(text.toLocaleLowerCase())) {
		options = [{ node: workspace.directoryStore.files, match: undefined }, ...nodes]
	}
	else {
		options = nodes
	}
}

function autocomplete(event: CustomEvent<SegmentSearchNodePair>) {
	text = workspace.directoryStore.getPathToItem(event.detail.node)
}

function selectOption(event: CustomEvent<{option: SegmentSearchNodePair, event}>) {
	const target = event.detail.option.node

	workspace.commands.moveFile.execute({
		subject,
		target
	})

	workspace.viewState.modal.close()
}
</script>

<main class="ModalContainer">
	<h1>Move <NodeLine node={subject} relativeTo={parent} /></h1>
	<div class="info">
		{#if parent === workspace.directoryStore.files}
			<span>Currently in Workspace Root</span>
		{:else}
			<span>Currently in</span> <NodeLine node={parent}/>
		{/if}
	</div>
	<ModalInputSelect
		{options}
		placeholder="Type to filter folders..."
		bind:selectedIndex
		bind:text
		on:autocomplete={autocomplete}
		on:select={selectOption}>
		<svelte:fragment slot="option" let:option>
			{#if option.node === workspace.directoryStore.files}
				Workspace Root
			{:else}
				<NodeLine
					node={option.node}
					showFileType={!option.node.fileType.match(implicitExtensionsMatch)}
					nameMatch={option.match}
					/>
			{/if}
		</svelte:fragment>
	</ModalInputSelect>
</main>

<style lang="scss">
h1 {
	display: flex;
	align-items: center;
	gap: .5em;
}
.info {
	color: var(--deemphasizedTextColor);
	margin-bottom: 1.25em;

	display: flex;
	align-items: center;
	gap: .5em;
	font-size: 90%;
	
	> span {
		font-style: italic;
	}
}

h1, .info {
	:global(.NodeLine) {
		gap: .125em;
	}
}
</style>
