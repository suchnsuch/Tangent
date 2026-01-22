<script lang="ts">
import { getContext } from 'svelte'
import { getNode, isReference, isSubReference, type TreeNodeOrReference } from 'common/nodeReferences'
import { getLinkDirectionFromEvent, type NavigationCallback } from 'app/events'
import { Workspace } from 'app/model'
import WorkspaceTreeNode from 'app/model/WorkspaceTreeNode'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'
import ListViewState, { arrowNavigateTargetSelector } from 'app/model/nodeViewStates/ListViewState'
import { BaseSetViewState } from 'app/model/nodeViewStates/SetViewState'
import NodeIcon from '../smart-icons/NodeIcon.svelte'
import arrowNavigate from 'app/utils/arrowNavigate'
import FloatingSetCreationRules, { shouldShowCreationRulesFromHover } from './FloatingSetCreationRules.svelte'

const workspace = getContext('workspace') as Workspace

export let state: ListViewState
export let layout: 'fill' | 'auto' = 'fill'
export let extraTop: number = 0
export let extraBottom: number = 0

export let onNavigate: NavigationCallback = null

$: items = state.items

function nodeClick(event, ref: TreeNodeOrReference) {
	if (onNavigate) onNavigate({
		origin: state.parent.node,
		target: ref,
		direction: getLinkDirectionFromEvent(event, workspace)
	})
	
	event.preventDefault()
	event.stopPropagation()
}

function nodeKeydown(event: KeyboardEvent, ref: TreeNodeOrReference) {
	if (event.key === 'Enter') {
		nodeClick(event, ref)
	}
}

let showCreateFromHover = false
let container: HTMLElement = null

function updateShowCreateFromHover(event: MouseEvent) {
	showCreateFromHover = shouldShowCreationRulesFromHover(event, container)
}


</script>

<main
	class={`ListView layout-${layout}`}
	style:padding-top={extraTop + 'px'}
	style:padding-bottom={extraBottom + 'px'}
	bind:this={container}
	use:arrowNavigate={{
		targetSelector: arrowNavigateTargetSelector,
		focusClass: ['focusable', 'focused']
	}}
	tabindex="-1"
	on:mousemove={updateShowCreateFromHover}
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
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div class="button no-callout arrowNavigate"
					tabindex="0"
					on:click={e => nodeClick(e, item)}
					on:keydown={e => nodeKeydown(e, item)}
				>
					<NodeIcon {node} />
					{node.name}
				</div>
			{/if}
		{:else}
			<p class="empty">No children</p>
		{/each}
	</article>
</main>

<FloatingSetCreationRules state={state.parent} canShow={showCreateFromHover} />

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