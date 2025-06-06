<script lang="ts">
import { getContext } from 'svelte'
import { getNode, isReference, isSubReference, TreeNodeOrReference } from 'common/nodeReferences'
import { WritableStore } from 'common/stores'
import { pluralize } from 'common/plurals'
import { EmbedType } from 'common/embedding'
import { EmbedFile, Folder, NoteFile, Workspace, WorkspaceTreeNode } from 'app/model'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'
import NoteEditor from '../editors/NoteEditor/NoteEditor.svelte'
import NodeIcon from '../smart-icons/NodeIcon.svelte'
import { NoteDetailMode } from 'app/model/nodeViewStates/NoteViewState'

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
		{#if node.embedType === EmbedType.Image}
			<div class={"imageCard " + layout}>
				<WorkspaceFileHeader {node} editable={false} />
				<div class="image" style={`background-image: url("${node.cacheBustPath}");`}></div>
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

.imageCard {
	display: flex;
	flex-direction: column;

	& :global(header) {
		margin: 0;
	}

	.image {
		flex-grow: 1;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;

		border-radius: var(--borderRadius);
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}

	&:not(.fill) {
		min-height: 20em;
		.image {
			border-radius: var(--borderRadius);
		}
	}
}
</style>