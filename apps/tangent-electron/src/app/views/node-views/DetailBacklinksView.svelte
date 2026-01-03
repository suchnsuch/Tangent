<script lang="ts">
import type { TreeNode } from 'common/trees'
import type { NodeViewState } from 'app/model/nodeViewStates'
import type { ConnectionInfo, HrefFormedLink } from 'common/indexing/indexTypes'
import type { NavigationCallback } from 'app/events'
import { WorkspaceTreeNode } from 'app/model'
import arrowNavigate from 'app/utils/arrowNavigate'
import LazyScrolledList from 'app/utils/LazyScrolledList.svelte'
import LinkInfoView from '../summaries/LinkInfoView.svelte'

export let state: NodeViewState
export let onNavigate: NavigationCallback

$: node = state.node instanceof WorkspaceTreeNode ? state.node : null
let inLinks: ConnectionInfo[] = null

$: updateInLinks($node)
function updateInLinks(node: TreeNode) {
	const newLinks = node?.meta?.inLinks
	if (newLinks !== inLinks) {
		inLinks = newLinks?.sort((a, b) => {
			if (a.from > b.from) {
				return 1
			}
			if (a.from < b.from) {
				return -1
			}
			return 0
		})
	}
}

function inLinkID(info: ConnectionInfo) {
	return `${info.from}_${info.start}-${info.end}`
}

function navigateTo(event: Event, inLink: ConnectionInfo, direction: 'in' | 'out') {
	event.stopPropagation()
	let link: HrefFormedLink = {
		...inLink,
		href: inLink.from,
		form: 'raw', // Requireed as the from is a full path
		from: node.path
	}

	onNavigate({
		link,
		origin: node,
		direction
	})
}

</script>

<main>
{#if inLinks?.length}
	<div class="inLinks detailsBlock"
		use:arrowNavigate={{
			containerSelector: '.lazy-list-items',
			scrollTime: 100
		}}
		tabindex="-1"
	>
		<LazyScrolledList items={inLinks} itemID={inLinkID}>
			<LinkInfoView
				slot="item"
				let:item={link}
				{link}
				target="from"
				className="button focusable"
				on:select={e => navigateTo(e, link, e.detail.direction)}
			/>
		</LazyScrolledList>
	</div>
{:else}
	<div class="inLinks inLinks-empty detailsBlock" tabindex="-1">No Incoming Links</div>
{/if}
</main>

<style lang="scss">
.inLinks :global(.lazy-list-items) {
	display: grid;
	grid-template-columns: .5fr .5fr;
	grid-auto-rows: auto;
	grid-auto-flow: dense;

	column-gap: 8px;
	row-gap: 8px;
	padding: 8px;

	> :global(*) {
		max-height: 12em;

		:global(.link-cursor-directional) & {
			cursor: e-resize;
		}
		:global(.link-cursor-directional.alt-pressed) & {
			cursor: w-resize;
		}
	}
}

.inLinks-empty {
	text-align: center;
	color: var(--deemphasizedTextColor);
	margin: 1em;
	font-style: italic;
}
</style>
