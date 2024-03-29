<script lang="ts">
import { wait } from '@such-n-such/core'
import type { TreeNode } from 'common/trees'

import type DirectoryView from 'app/model/directoryView'
import { getContext, tick } from 'svelte';
import type Workspace from 'app/model/Workspace'
import WorkspaceTreeNode from 'app/model/WorkspaceTreeNode'
import { isModKey } from 'app/utils/events';
import { appendContextTemplate, ContextMenuConstructorOptions } from 'app/model/contextmenu';
import LazyScrolledList from 'app/utils/LazyScrolledList.svelte';
import type { NavigationData } from 'app/events';
import { getTreeNodeTransfer, hasTreeNodeTransfer, setTreeNodeTransfer } from 'app/utils/dragDrop';
import { queryFileType } from 'common/dataTypes/QueryInfo';
import { iconForNode } from 'common/icons';

let workspace = getContext('workspace') as Workspace

const invisibleExtensions = [
	'.md', 'folder', 'tag', queryFileType
]

// Expects the output of loadDirectory from main/files.js
export let directoryView: DirectoryView

let container: HTMLElement = null
let renameTarget: TreeNode = null
let renameElement: HTMLElement = null

$: {
	if (renameElement) {
		renameElement.focus()
		getSelection().selectAllChildren(renameElement)
	}
}

$: selection = directoryView.selection
$: parentsOfSelection = getParentsOfSelection($selection)
function getParentsOfSelection(selection: TreeNode[]) {
	let parents = new Set<TreeNode>()
	const store = directoryView.store

	for (const item of selection) {
		let walker = store.getParent(item)
		while (walker && walker !== directoryView.root) {
			parents.add(walker)
			walker = store.getParent(walker)
		}
	}

	return parents
}

$: visibleItems = Array.from($directoryView.visibleItems)

function itemClass(item: TreeNode) {
	let result = 'FileTreeItem ' + item.fileType

	if (item instanceof WorkspaceTreeNode) {
		result += ' ' + itemIdClass(item)
		const parent = workspace.directoryStore.getParent(item)
		if (parent && parent instanceof WorkspaceTreeNode) {
			result += ' ' + itemChildrenClass(parent)
		}
	}

	return result
}

function itemIdClass(item: WorkspaceTreeNode) {
	return 'Item_' + item.localId
}

function itemChildrenClass(item: WorkspaceTreeNode) {
	return 'ChildOf_' + item.localId
}

function itemClicked(event: MouseEvent, item:TreeNode) {

	if (workspace.viewState.tangent.currentNode.value === item) {
		return
	}

	const nav: NavigationData = {
		target: item
	}

	if (isModKey(event)) {
		nav.origin = 'current'
		if (event.shiftKey) {
			nav.direction = 'replace'
		}
	}
	
	workspace.navigateTo(nav)
}

function itemContext(event: MouseEvent, item: TreeNode) {
	let menu: ContextMenuConstructorOptions[] = []

	if (item.fileType !== 'tag') {
		// TODO: Support this for tags
		menu.push({
			label: 'Rename', 
			click() {
				renameTarget = item
			}
		})
	}

	if (item.fileType === 'folder') {
		menu.push({
			command: workspace.commands.createNewFile,
			commandContext: {
				folder: item
			}
		})
		menu.push({
			label: 'Create New Folder',
			click: () => {
				const folder = workspace.commands.createNewFolder.execute({
					parent: item
				})
				renameTarget = folder
			}
		})
	}

	if (item.fileType !== 'tag') {

		menu.push({
			command: workspace.commands.openInFileBrowser,
			commandContext: {
				target: item
			}
		})

		menu.push({
			command: workspace.commands.duplicateNode,
			commandContext: {
				target: item
			}
		})
		
		menu.push({
			command: workspace.commands.deleteNode,
			commandContext: {
				target: item
			}
		})
	}
	
	appendContextTemplate(event, menu)
}

function renameNode() {
	if (!renameTarget || !renameElement) return
	let newName = renameElement.textContent
	if (renameTarget instanceof WorkspaceTreeNode && renameTarget.name !== newName) {
		renameTarget.rename(newName)
	}

	renameTarget = null
}

function startNodeRename(item: TreeNode) {
	if (item.fileType !== 'tag') {
		// TODO: Support this for tags
		renameTarget = item
	}
}

function onRenameKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		event.preventDefault()
		event.stopPropagation()
		renameElement.blur()
	}
}

function showFileType(item: TreeNode) {
	return !invisibleExtensions.includes(item.fileType)
}

function isOnThread(item: TreeNode) {
	return workspace.viewState.tangent.thread.value.includes(item)
}

// Dragged Item Events
function dragStart(event: DragEvent, item: TreeNode) {
	setTreeNodeTransfer(event.dataTransfer, item)
	const target = event.target as HTMLElement
	target.classList.add('dragging')
}

function dragEnd(event: DragEvent, item: TreeNode) {
	const target = event.target as HTMLElement
	target.classList.remove('dragging')
}

// Drop Target Events
function getDropTargetItem(event: DragEvent, item: TreeNode) {
	if (!hasTreeNodeTransfer(event.dataTransfer)) return null
	if (item.fileType === 'folder') return item as WorkspaceTreeNode
	return workspace.directoryStore.getParent(item) as WorkspaceTreeNode
}

function dragOver(event: DragEvent, item: TreeNode) {
	if (getDropTargetItem(event, item)) {
		event.preventDefault()
		event.dataTransfer.dropEffect = 'move'
	}
}

function dragEnter(event: DragEvent, item: TreeNode) {
	const targetItem = getDropTargetItem(event, item)
	if (targetItem) {
		// Leaves of x are sometimes happening _after_ enters of y. No me gusta.
		// This delay ensure enter is always handled after leaves.
		wait().then(() => {
			const targetElement = container.querySelector('.' + itemIdClass(targetItem))
			if (targetElement) {
				targetElement.classList.add('dragover')
			}
			container.querySelectorAll('.' + itemChildrenClass(targetItem)).forEach(s => {
				s.classList.add('dragoverSibling')
			})
		})
	}
}

function dragLeave(event: DragEvent, item: TreeNode) {
	const targetItem = getDropTargetItem(event, item)
	if (targetItem) {
		const targetElement = container.querySelector('.' + itemIdClass(targetItem))
		if (targetElement) {
			targetElement.classList.remove('dragover')
		}
		container.querySelectorAll('.' + itemChildrenClass(targetItem)).forEach(s => {
			s.classList.remove('dragoverSibling')
		})
	}
}

function drop(event: DragEvent, item: TreeNode) {
	const dropItem  = getDropTargetItem(event, item)
	if (!dropItem) return

	container.querySelectorAll('.dragover, .dragoverSibling').forEach(e => {
		e.classList.remove('dragover', 'dragoverSibling')
	})
	const draggedItem = getTreeNodeTransfer(event.dataTransfer, workspace.directoryStore)

	if (draggedItem !== dropItem &&
		workspace.directoryStore.getParent(draggedItem) !== dropItem
	) {
		workspace.commands.moveFile.execute({
			subject: draggedItem,
			target: dropItem
		})
	}
}

</script>

<div bind:this={container}>
<LazyScrolledList items={visibleItems}>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		slot="item" let:item
		class={itemClass(item)}
		class:isSelected={$selection.includes(item)}
		class:isParent={parentsOfSelection.has(item)}
		class:isOpen={directoryView.isItemOpen(item)}
		class:isOnThread={isOnThread(item)}
		draggable="true"
		on:click={event => itemClicked(event, item)}
		on:contextmenu={event => itemContext(event, item)}

		on:dragstart={event => dragStart(event, item)}
		on:dragend={event => dragEnd(event, item)}
		
		on:dragover={event => dragOver(event, item)}
		on:dragenter={event => dragEnter(event, item)}
		on:dragleave={event => dragLeave(event, item)}
		on:drop={event => drop(event, item)}
		>
		{#each {length: item.depth ? item.depth - 1 : 0} as _, i}
			<span class="depth"
				on:click={e => {
					if (item.fileType === 'folder') {
						directoryView.toggleOpen(item)
						e.stopPropagation()
						return
					}
				}}
			></span>
		{/each}
		{#if item.children}
			<span class="opener"
				class:isOpen={directoryView.isItemOpen(item)}
				on:click|stopPropagation={() => directoryView.toggleOpen(item)}
			><svg style="width: 10px; height: 10px;">
				<use href="opener.svg#opener-arrow"/>
			</svg></span>
		{:else}
			<span class="opener-placeholder"></span>
		{/if}
		<span class="icon"><svg style="width: 16px; height: 16px;">
			{#each iconForNode(item) as icon }
				<use href={icon}/>
			{/each}
		</svg></span>
		{#if item === renameTarget}
			<span class="name rename"
				contenteditable="true"
				bind:this={renameElement}
				on:blur={renameNode}
				on:keydown={onRenameKeydown}
			>{item.name}</span>
		{:else}
			<span class="name"
				on:dblclick={e => startNodeRename(item)}
			>
				{item.name}{#if showFileType(item)}<span class="extension"
					>{item.fileType}</span>
				{/if}
			</span>
		{/if}
	</div>
</LazyScrolledList>
</div>

<style lang="scss">
.FileTreeItem {
	display: flex;
	width: 100%;

	background-color: transparent;
	transition: background-color .2s;

	font-size: 90%;

	white-space: nowrap;
	text-overflow: ellipsis;

	cursor: pointer;

	&.isParent:not(.isOpen) {
		.depth, .opener {
			background: var(--selectionBackgroundColor);
		}
		.opener {
			border-top-right-radius: var(--borderRadius);
			border-bottom-right-radius: var(--borderRadius);
		}
	}

	&:hover, &.isSelected {
		background-color: var(--selectionBackgroundColor)
	}

	&.isOnThread {
		font-weight: 600;
	}

	&:active {
		background-color: var(--selectionPressedBackgroundColor);
	}
}
:global {
	.FileTreeItem {
		&.dragging {
			opacity: .6;
		}
		&.dragover {
			background-color: var(--dropTargetBackgroundColor) !important;
		}
		&.dragoverSibling {
			background-color: var(--dropTargetChildBackgroundColor) !important;
		}
	}
}

.name {
	flex-shrink: 4;
	padding: .2em;

	&:not(.rename) {
		text-overflow: ellipsis;
		overflow: hidden;
	}

	&.rename {
		white-space: pre-wrap;
	}
}

.extension {
	color: var(--deemphasizedTextColor);
}

.depth {
	width: .75em;
	flex-shrink: 0;
}

.opener, .opener-placeholder {
	width: 1.5em;
	flex-shrink: 0;
}

.opener {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	svg {
		transition: transform .2s, opacity .1s;
		opacity: .7; 
	}
	&:hover svg {
		opacity: 1;
	}
	&.isOpen svg {
		transform: rotate(90deg);
	}
}
.icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;

	margin-right: .25em;

	opacity: .6;
	transition: opacity .1s;

	.FileTreeItem:hover &, .isSelected & {
		opacity: 1;
	}
}
</style>
