<script lang="ts">
import { getLinkDirectionFromEvent, type NavigationData } from 'app/events'
import type { Workspace } from 'app/model'

import type CardsViewState from 'app/model/nodeViewStates/CardsViewState'
import { NoteDetailMode } from 'app/model/nodeViewStates/NoteViewState'
import LazyScrolledList from 'app/utils/LazyScrolledList.svelte'
import { ForwardingStore } from 'common/stores'
import { getNodeOrReferenceId, type TreeNodeOrReference } from 'common/nodeReferences'
import { getContext } from 'svelte'
import { onMount, tick } from 'svelte'
import SetCreationRules from './SetCreationRules.svelte'
import NodePreview from '../summaries/NodePreview.svelte'
import arrowNavigate from 'app/utils/arrowNavigate'
import FloatingSetCreationRules, { shouldShowCreationRulesFromHover } from './FloatingSetCreationRules.svelte'
import EmptyList from './EmptyList.svelte'

const workspace = getContext('workspace') as Workspace

const needsAltToScroll = workspace.settings.cardViewCardsHoldAltToScroll

export let state: CardsViewState
export let extraTop: number = 0
export let extraBottom: number = 0

export let onNavigate: (data: NavigationData) => void
export let onViewReady: () => void

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
		sendViewReady()
	})
})

function nodeClick(event: MouseEvent, ref: TreeNodeOrReference) {
	if (event.defaultPrevented) return
	
	onNavigate({
		origin: state.parent.node,
		target: ref,
		direction: getLinkDirectionFromEvent(event, workspace)
	})
	
	event.preventDefault()
	event.stopPropagation()
}

function nodeKeydown(event: KeyboardEvent, ref: TreeNodeOrReference) {
	if (event.defaultPrevented) return
	if (event.key != 'Enter') return

	onNavigate({
		origin: state.parent.node,
		target: ref,
		direction: getLinkDirectionFromEvent(event, workspace)
	})

	event.preventDefault()
}

function sendViewReady() {
	if (onViewReady) onViewReady()
}

let showCreateFromHover = false
let showCreateFromScroll = false
let container: HTMLElement = null
let willCreateNewFiles = false

function onScroll() {
	if (!container) return

	// Hide the creation rule button when we're scrolled to the bottom as there is
	// a card-based button right there.
	const height = container.getBoundingClientRect().height
	showCreateFromScroll = container.scrollHeight - container.scrollTop - height > 50
}

function updateShowCreateFromHover(event: MouseEvent) {
	showCreateFromHover = shouldShowCreationRulesFromHover(event, container)
}

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div class="CardsView" class:layout-fill={layout === 'fill'} class:needs-alt={$needsAltToScroll}
	style:padding-top={extraTop + 'px'}
	style:padding-bottom={extraBottom + 'px'}
	style:--noteBackgroundColor="var(--backgroundColor)"
	bind:this={container}

	tabindex="-1"
	use:arrowNavigate={{
		containerSelector: '.lazy-list-items',
		scrollTime: 100,
		focusClass: 'focused',
		scrollMarginY: {
			start: extraTop + 16,
			end: extraBottom + 8
		}
	}}
	on:scroll={onScroll}
	on:mousemove={updateShowCreateFromHover}
>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<LazyScrolledList
		items={$items}
		itemID={getNodeOrReferenceId}
		mode="append"
		groupStep={10}
		onRangeUpdated={sendViewReady}
	>
		<svelte:fragment slot="item" let:item>
			<div class="card" tabindex="0"
				on:click={e => nodeClick(e, item)}
				on:keydown={e => nodeKeydown(e, item)}
			>
				<NodePreview {item}
					noteFixedTitle={true}
					noteShowHeaderIcon={false}
					noteDetailMode={detailMode}
				/>
			</div>
		</svelte:fragment>
		<svelte:fragment slot="empty">
			{#if !willCreateNewFiles}
				<EmptyList {layout} {extraTop}/>
			{/if}
		</svelte:fragment>
		<SetCreationRules slot="after" state={state.parent} _class="card create"/>
	</LazyScrolledList>

</div>

<FloatingSetCreationRules state={state.parent} canShow={showCreateFromHover && showCreateFromScroll} bind:willCreateNewFiles />

<style lang="scss">
.CardsView {
	text-align: left;
	padding-top: 3rem;

	&.layout-fill {
		position: absolute;
		inset: 0;

		overflow-x: hidden;
		overflow-y: auto;
	}

	:global {
		> .lazy-list-items {
			display: grid;
			padding: 1rem;
			gap: 1rem;

			grid-template-columns: repeat(auto-fit, minmax(min(calc(50% - 2rem), calc(26rem)), 1fr));
			grid-auto-rows: min-content;
			grid-auto-flow: row;

			> .card {
				position: relative;
				height: 20rem;

				box-sizing: border-box;

				border: 1px solid var(--borderColor);
				background-color: var(--backgroundColor);

				border-radius: var(--borderRadius);

				padding: .5rem;

				--fontSize: calc(1rem * .8);
				--headerFontSizeFactor: 2;

				&.focused {
					outline: 2px solid #666;
					&:focus {
						outline-color: var(--accentBackgroundColor);
					}
				}

				* {
					-webkit-user-select: auto;
					user-select: auto;
				}

				.noteEditor header {
					// Fix the header overlap since the headers have background color
					border-top-left-radius: var(--borderRadius);
					border-top-right-radius: var(--borderRadius);
				}

				.detailsInfoBar {
					// Fix details overlap since the details have background color
					border-bottom-left-radius: var(--borderRadius);
					border-bottom-right-radius: var(--borderRadius);

					background: linear-gradient(transparent, var(--noteBackgroundColor) 25%);
				}
			}

			.create {
				font-size: 120%;

				color: var(--deemphasizedTextColor);
				background-color: unset;
				--inputBorderRadius: var(--borderRadius);

				padding: unset;
			}
		}
	}
}

// Block scrolling of note cards...
.CardsView.needs-alt :global(.card) :global(.noteEditor) {
	overflow-y: hidden;
}
// ...unless alt is pressed
:global(.alt-pressed) .CardsView.needs-alt :global(.card) :global(.noteEditor) {
	overflow-y: auto;
}
</style>
