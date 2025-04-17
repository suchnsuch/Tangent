<script lang="ts">
import type { NavigationData } from 'app/events';
import type { Workspace } from 'app/model';
import EmbedFile from 'app/model/EmbedFile';
import Folder from 'app/model/Folder';

import type CardsViewState from 'app/model/nodeViewStates/CardsViewState';
import { NoteDetailMode } from 'app/model/nodeViewStates/NoteViewState';
import NoteFile from 'app/model/NoteFile';
import LazyScrolledList from 'app/utils/LazyScrolledList.svelte';
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte';
import { EmbedType } from 'common/embedding';
import { WritableStore, ForwardingStore } from 'common/stores'
import { getNode, getNodeOrReferenceId, isReference, isSubReference, TreeNodeOrReference } from 'common/nodeReferences';
import { pluralize } from 'common/plurals';
import { createEventDispatcher } from 'svelte';
import { getContext } from 'svelte';
import { onMount, tick } from 'svelte';
import NoteEditor from '../editors/NoteEditor/NoteEditor.svelte';
import SetCreationRules from './SetCreationRules.svelte';
import WorkspaceTreeNode from 'app/model/WorkspaceTreeNode';
import NodeIcon from '../smart-icons/NodeIcon.svelte';
    import NodePreview from '../summaries/NodePreview.svelte';

const dispatch = createEventDispatcher<{
	navigate: NavigationData
	'view-ready': undefined
}>()

const workspace = getContext('workspace') as Workspace

const needsAltToScroll = workspace.settings.cardViewCardsHoldAltToScroll

export let state: CardsViewState
export let extraTop: number = 0

export let layout: 'fill' | 'auto' = 'fill'

$: showWordCount = state.settings.showWordCount

$: detailMode = setDetailMode($showWordCount)
function setDetailMode(wordCount: boolean): NoteDetailMode {
	let result = NoteDetailMode.None
	if (wordCount) {
		result |= NoteDetailMode.Words
	}
	return result
}

const items = new ForwardingStore<TreeNodeOrReference[]>([])
$: items.forwardFrom(state.items)

onMount(() => {
	tick().then(() => {
		// This view is always ready to go essentially immediately
		dispatch('view-ready')
	})
})

function nodeClick(event, ref: TreeNodeOrReference) {
	dispatch('navigate', {
		origin: state.parent.node,
		target: ref
	})
	
	event.preventDefault()
	event.stopPropagation()
}
</script>

<div class="cards" class:layout-fill={layout === 'fill'} class:needs-alt={$needsAltToScroll}
	style:padding-top={`${extraTop}px`}
	style:--noteBackgroundColor="var(--backgroundColor)"
>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<LazyScrolledList
		items={$items}
		itemID={getNodeOrReferenceId}
		mode="append"
		groupStep={10}
		on:range-updated={e => dispatch('view-ready')}
	>
		<svelte:fragment slot="item" let:item>
			<div class="card" on:click={e => nodeClick(e, item)}>
				<NodePreview {item}
					noteFixedTitle={true}
					noteShowHeaderIcon={false}
					noteDetailMode={detailMode}
				/>
			</div>
		</svelte:fragment>
		<SetCreationRules slot="after" state={state.parent} _class="card create"/>
	</LazyScrolledList>
</div>

<style lang="scss">
.cards {
	text-align: left;
	padding-top: 3rem;

	&.layout-fill {
		position: absolute;
		inset: 0;

		overflow-x: hidden;
		overflow-y: auto;
	}

	> :global(.lazy-list-items) {
		display: grid;
		padding: 1rem;
		gap: 1rem;

		grid-template-columns: repeat(auto-fit, minmax(min(calc(50% - 2rem), calc(26rem)), 1fr));
		grid-auto-rows: min-content;
		grid-auto-flow: row;

		> :global(.card) {
			position: relative;
			height: 20rem;

			box-sizing: border-box;

			border: 1px solid var(--borderColor);
			background-color: var(--backgroundColor);

			border-radius: var(--borderRadius);

			padding: .5rem;

			--fontSize: calc(1rem * .8);
			--headerFontSizeFactor: 2;

			:global(*) {
				-webkit-user-select: auto;
				user-select: auto;
			}

			:global(.noteEditor header) {
				// Fix the header overlap since the headers have background color
				border-top-left-radius: var(--borderRadius);
				border-top-right-radius: var(--borderRadius);
			}

			:global(.details) {
				// Fix details overlap since the details have background color
				border-bottom-left-radius: var(--borderRadius);
				border-bottom-right-radius: var(--borderRadius);

				background: linear-gradient(transparent, var(--noteBackgroundColor) 25%);
			}
		}
		> :global(.create) {
			font-size: 120%;

			color: var(--deemphasizedTextColor);
			background-color: unset;
			--inputBorderRadius: var(--borderRadius);

			padding: unset;
		}
	}	
}

// Block scrolling of note cards...
.cards.needs-alt :global(.card) :global(.noteEditor) {
	overflow-y: hidden;
}
// ...unless alt is pressed
:global(.alt-pressed) .cards.needs-alt :global(.card) :global(.noteEditor) {
	overflow-y: auto;
}
</style>
