<script lang="ts">
import { getContext } from 'svelte'
import { getNode, isReference, isSubReference, type TreeNodeOrReference, type TreeNodeReference } from 'common/nodeReferences'
import { WritableStore } from 'common/stores'
import { pluralize } from 'common/plurals'
import { EmbedType } from 'common/embedding'
import { EmbedFile, Folder, NoteFile, Workspace, WorkspaceTreeNode } from 'app/model'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'
import NoteEditor from '../editors/NoteEditor/NoteEditor.svelte'
import NodeIcon from '../smart-icons/NodeIcon.svelte'
import { NoteDetailMode } from 'app/model/nodeViewStates/NoteViewState'
import PdfPreview from '../node-views/PdfPreview.svelte'
import type { NodeViewProps } from '../node-views/nodeView'
import NoteDetailsSummary from './NoteDetailsSummary.svelte'
import { loadMediaChrome } from 'app/shim/media-chrome'
import type { EditorRange } from 'typewriter-editor'
import { IndexData, StructureType } from 'common/indexing/indexTypes'

const workspace: Workspace = getContext('workspace')

let {
	item,

	layout = 'fill',
	background = 'none',

	noteFixedTitle = false,
	noteShowHeaderIcon = true,
	noteDetailMode = NoteDetailMode.None
} : Pick<NodeViewProps, 'layout' | 'background'> & {
	item: TreeNodeOrReference

	noteFixedTitle?: boolean
	noteShowHeaderIcon?: boolean
	noteDetailMode?: NoteDetailMode
} = $props()

let node = $derived(getNode(item, workspace.directoryStore))
let ref = $derived(isReference(item) ? item : null)

function preventDefault(event: Event) {
	event.preventDefault()
}

function getSubRefSlice(subRef: TreeNodeReference) {
	if (!subRef) return null

	let { start, end } = subRef

	if (subRef.type === StructureType.Header) {
		// We're already displaying the header as the title
		// No need to repeat

		for (const header of IndexData.headers(node?.meta)) {
			if (header.start === subRef.start) {
				start = header.end + 1
				break
			}
		}
	}

	return new WritableStore([start, end] as EditorRange)
}

</script>

{#snippet subRefHeader()}
	<header class="subRefNoteHeader">
		<div class="title">
			{#if ref.type === StructureType.Header}
				§
			{/if}
			{ref.title}
		</div>
		<div class="nodeName">{node?.name}</div>
	</header>
{/snippet}

{#if node instanceof NoteFile}
	{@const subRef = (ref && isSubReference(ref)) ? ref : null}
	{@const noteState = {
		// A bit messy, but faster than an entire view state
		note: node,
		annotations: ref?.annotations ? new WritableStore(ref.annotations) : undefined,
		detailMode: noteDetailMode,
		slice: getSubRefSlice(subRef)
	}}
	<div class={[
			'noteCard', layout,
			{
				subReference: subRef != null,
				hideNodeHeader: subRef?.title != null
			}
		]
	}>
		
		<NoteEditor
			state={noteState}
			{background}
			{layout}
			allowOverscroll={false}
			smoothScrollOnInit={false}
			editable={false}
			fixedTitle={noteFixedTitle}
			extraBottom={20}
			showHeaderIcon={noteShowHeaderIcon}
			header={subRef ? subRefHeader : null}
		/>
		{#if noteDetailMode != NoteDetailMode.None}
			<div class="detailsInfoBar">
				<span></span>
				<span class="separator"></span>
				<NoteDetailsSummary state={noteState} mode={noteDetailMode} />
			</div>
		{/if}
	</div>
{:else if node instanceof Folder}
	{@const children = node.children?.length ? [...node.visibleChildren()] : []}
	<div class={"folderCard " + layout}>
		<WorkspaceFileHeader {node} editable={false} showExtension={false} />
		{#if children.length > 0}
			<div class="children">
				<ul class:long={children.length > 10}>
					{#each children as child}
						<li>{child.name}</li>
					{/each}
				</ul>
			</div>
			<div class="count">{pluralize(children.length, '$$ Children', 'One Child', '')}</div>
		{:else}
			<div class="empty">
				Folder is Empty
			</div>
		{/if}
	</div>
{:else if node instanceof EmbedFile}
	{@const embedType = node.embedType}
	{#if embedType !== EmbedType.Invalid}
		<div class={"embedCard " + layout}>
			<WorkspaceFileHeader {node} editable={false} />
			{#if embedType === EmbedType.Image}
				<div class="image" style={`background-image: url("${node.cacheBustPath}"); ${layout === 'auto' ? 'height: 250px;' : ''}`}></div>
			{:else if embedType === EmbedType.Audio}
				{#await loadMediaChrome()}
					…
				{:then _} 
					<media-controller class="audio stretch" autohide="-1" gesturesdisabled>
						<audio slot="media" src={node.cacheBustPath}></audio>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<media-play-button slot="centered-chrome" onclick={preventDefault}></media-play-button>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<media-control-bar onclick={preventDefault}>
							<media-time-display showduration notoggle></media-time-display>
							<media-time-range></media-time-range>
						</media-control-bar>
					</media-controller>
				{/await}
			{:else if embedType === EmbedType.Video}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="video stretch" onclick={preventDefault}>
					{#await loadMediaChrome()}
						…
					{:then _}
						<media-controller class="roundedBottom" gesturesdisabled>
							<!-- svelte-ignore a11y_media_has_caption -->
							<video slot="media" src={node.cacheBustPath}></video>
							<media-control-bar>
								<media-play-button></media-play-button>
								<media-mute-button></media-mute-button>
								<media-time-display showduration notoggle></media-time-display>
								<media-time-range></media-time-range>
								<media-fullscreen-button></media-fullscreen-button>
							</media-control-bar>
						</media-controller>
					{/await}
				</div>
			{:else if embedType === EmbedType.PDF}
				<div class="pdf stretch">
					<PdfPreview path={node.cacheBustPath} />
				</div>
			{/if}
		</div>
	{/if}
	
{:else if node instanceof WorkspaceTreeNode}
	<div class={"fallbackCard " + layout}>
		<WorkspaceFileHeader {node} editable={false} showExtension={false} />
		<div style="text-align: center; --iconStroke: var(--deemphasizedTextColor);">
			<NodeIcon {node} size="8em" />
		</div>
	</div>
{/if}

<style lang="scss">
.fill {
	position: absolute;
	inset: 0;
}

.noteCard {
	.subRefNoteHeader {
		padding: 1em;
		padding-bottom: .75em;

		.title {
			font-size: 120%;
			font-weight: 600;
			margin-bottom: .25em;
		}

		.nodeName {
			color: var(--deemphasizedTextColor);
			font-size: 80%;
		}
	}
}

.folderCard {
	display: flex;
	flex-direction: column;

	> :global(header) {
		width: 100%;
	}

	.count {
		color: var(--deemphasizedTextColor);
		font-size: var(--fontSize);
		text-align: center;
		margin: .25em;
	}

	.children {
		flex-grow: 1;
		overflow: auto;
	}

	ul {
		list-style: disc;
		padding-right: 1em;
		margin: 0;
		font-size: var(--fontSize);

		&.long {
			columns: 2;
		}

		li {
			margin: .25em 0;
		}
	}

	.empty {
		margin: 5em auto;
		color: var(--deemphasizedTextColor);
	}
}

.embedCard {
	display: flex;
	flex-direction: column;

	& :global(header) {
		margin: 0 !important;
	}

	.image {
		flex-grow: 1;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;

		border-radius: var(--borderRadius);
	}

	.audio {
		display: block;
		flex-direction: column;
		justify-content: center;
		padding: 1em;

		media-play-button {
			border-radius: var(--borderRadius);
			--media-button-icon-height: 48px;
		}
	}

	.video {
		position: relative;
		media-controller {
			position: absolute;
			inset: 0;
			bottom: 2px;
		}
	}

	.pdf, .pdf > :global(div) {
		border-bottom-left-radius: var(--borderRadius);
		border-bottom-right-radius: var(--borderRadius);
	}

	.stretch {
		position: relative;
		flex-grow: 1;
	}

	&.fill {
		min-height: 20em;

		.image {
			border-top-left-radius: 0;
			border-top-right-radius: 0;
		}

		.audio {
			// This presents the audio centered relative to the container rather than
			// the gap under the header. Looks nicer.
			position: absolute;
			inset: 0;
			bottom: 2px;
		}
	}

	&.auto {
		.audio, .video {
			min-height: 150px;
			min-width: 300px;
		}

		.pdf {
			min-height: 300px;
			min-width: 200px;
		}
	}
}

.detailsInfoBar {
	position: absolute;
	z-index: 10;
	left: 0;
	right: 0;
	bottom: 0;

	background: var(--noteBackgroundColor);

	font-size: 70%;
	box-sizing: border-box;
	height: 24px;
	padding: 4px 10px 4px 6px;
	flex-grow: 0;
	flex-shrink: 0;

	display: grid;
	grid-template-columns: max-content 1fr max-content;
	align-items: center;
}

</style>