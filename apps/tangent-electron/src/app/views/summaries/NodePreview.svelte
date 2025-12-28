<script lang="ts">
import { getContext } from 'svelte'
import { getNode, isReference, isSubReference, type TreeNodeOrReference } from 'common/nodeReferences'
import { WritableStore } from 'common/stores'
import { pluralize } from 'common/plurals'
import { EmbedType } from 'common/embedding'
import { EmbedFile, Folder, NoteFile, Workspace, WorkspaceTreeNode } from 'app/model'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'
import NoteEditor from '../editors/NoteEditor/NoteEditor.svelte'
import NodeIcon from '../smart-icons/NodeIcon.svelte'
import { NoteDetailMode } from 'app/model/nodeViewStates/NoteViewState'
import PdfPreview from '../node-views/PdfPreview.svelte'

const workspace: Workspace = getContext('workspace')

export let item: TreeNodeOrReference

export let layout: 'fill' | 'auto' = 'fill'
export let background: 'auto' | 'none' = 'none'

export let noteFixedTitle = false
export let noteShowHeaderIcon = true
export let noteDetailMode: NoteDetailMode = NoteDetailMode.None

</script>

{#if !isSubReference(item)}
	{@const node = getNode(item, workspace.directoryStore)}
	{@const ref = isReference(item) ? item : null}
	
	{#if node instanceof NoteFile}
		<NoteEditor
			state={{
				note: node,
				// A bit messy, but faster than an entire viewstate
				annotations: ref?.annotations ? new WritableStore(ref.annotations) : undefined,
				detailMode: noteDetailMode
			}}
			{background}
			{layout}
			allowOverscroll={false}
			editable={false}
			fixedTitle={noteFixedTitle}
			extraBottom={20}
			showHeaderIcon={noteShowHeaderIcon}
		/>
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
					<media-controller class="audio stretch" autohide="-1" gesturesdisabled>
						<audio slot="media" src={node.cacheBustPath}></audio>
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<media-play-button slot="centered-chrome" on:click|preventDefault></media-play-button>
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<media-control-bar on:click|preventDefault>
							<media-time-display showduration notoggle></media-time-display>
							<media-time-range></media-time-range>
						</media-control-bar>
					</media-controller>
				{:else if embedType === EmbedType.Video}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div class="video stretch" on:click|preventDefault>
						<media-controller class="roundedBottom" gesturesdisabled>
							<!-- svelte-ignore a11y-media-has-caption -->
							<video slot="media" src={node.cacheBustPath}></video>
							<media-control-bar>
								<media-play-button></media-play-button>
								<media-mute-button></media-mute-button>
								<media-time-display showduration notoggle></media-time-display>
								<media-time-range></media-time-range>
								<media-fullscreen-button></media-fullscreen-button>
							</media-control-bar>
						</media-controller>
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
{:else}
	{@const ref = isReference(item) ? item : null}
	Show Subreference "{ref.title}" here.
{/if}


<style lang="scss">
.fill {
	position: absolute;
	inset: 0;
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

</style>