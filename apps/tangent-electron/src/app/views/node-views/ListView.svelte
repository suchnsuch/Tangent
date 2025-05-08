<script lang="ts">
import { createEventDispatcher, getContext } from 'svelte'
import { getNode, isReference, isSubReference, TreeNodeOrReference } from 'common/nodeReferences'
import { NavigationData } from 'app/events'
import { Workspace } from 'app/model'
import WorkspaceTreeNode from 'app/model/WorkspaceTreeNode'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'
import ListViewState from 'app/model/nodeViewStates/ListViewState'
import { BaseSetViewState } from 'app/model/nodeViewStates/SetViewState'
import NodeIcon from '../smart-icons/NodeIcon.svelte'

const dispatch = createEventDispatcher<{
	navigate: NavigationData
	'view-ready': undefined
}>()

const workspace = getContext('workspace') as Workspace

export let state: ListViewState
export let layout: 'fill' | 'auto' = 'fill'
export let extraTop: number = 0
$: items = state.items

function nodeClick(event, ref: TreeNodeOrReference) {
	dispatch('navigate', {
		origin: state.parent.node,
		target: ref
	})
	
	event.preventDefault()
	event.stopPropagation()
}

</script>

<main
	class={`layout-${layout}`}
	style:padding-top={`${extraTop}px`}
>
	{#if (state.parent instanceof BaseSetViewState && state.parent.isLensOverridden) && state.parent.node instanceof WorkspaceTreeNode}
		<WorkspaceFileHeader node={state.parent.node} showExtension={false} editable={false} />
	{/if}
	<article>
		{#each $items as item}
			{#if isReference(item) && isSubReference(item)}
				Show Subreference "{item.title}" here.
			{:else}
				{@const node = getNode(item, workspace.directoryStore)}
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<div class="button subtle" on:click={e => nodeClick(e, item)}>
					<NodeIcon {node} />
					{node.name}
				</div>
			{/if}
		{:else}
			<p class="empty">No children</p>
		{/each}
	</article>
</main>

<style lang="scss">
main {
	
	&.layout-fill {
		position: absolute;
		inset: 0;
		overflow-x: hidden;
		overflow-y: auto;
	}
}
article {
	max-width: 40em;
	margin: 0 auto;
	padding: 1em 2em;
}

div {
	display: flex;
	align-items: center;
	gap: 0.5em;
}

.empty {
	color: var(--deemphasizedTextColor);
	text-align: center;
}

</style>