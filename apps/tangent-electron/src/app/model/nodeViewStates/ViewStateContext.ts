import { swapRemove } from '@such-n-such/core'
import QueryInfo from 'common/dataTypes/QueryInfo'
import type { TreeChange, TreeNode } from 'common/trees'
import { EmbedType } from 'common/embedding'
import { getNodeFromReference, isNode, isReference, isSubReference, TreeNodeOrReference } from 'common/nodeReferences'
import { FolderViewState, ImageViewState, NoteViewState } from '.'
import DataFile from '../DataFile'
import EmbedFile from '../EmbedFile'
import Folder from '../Folder'
import NoteFile from '../NoteFile'
import type Workspace from '../Workspace'
import type NodeViewState from './NodeViewState'
import { NoteDetailMode } from './NoteViewState'
import QueryViewState from './QueryViewState'
import TagViewState from './TagViewState'
import Tag from '../Tag'
import type { Tangent } from '..'
import UnhandledViewState from './UnhandledViewState'

// This would create a great "broadcast" source for ViewStates
export default class ViewStateContext {

	workspace: Workspace
	tangent: Tangent

	parent: ViewStateContext = null
	children: ViewStateContext[] = []

	// TODO: Replication support
	private states: Map<string, NodeViewState> = new Map()

	constructor(workspace: Workspace, tangent: Tangent) {
		this.workspace = workspace
		this.tangent = tangent
	}

	// Post create
	customizeNewState?: (state: NodeViewState) => void

	dispose() {
		if (this.parent) {
			swapRemove(this.parent.children, this)
		}
		this.clearStates()
	}

	clearStates() {
		for (const state of this.states.values()) {
			if (state.dispose) state.dispose()
		}
		this.states.clear()
	}

	createChild() {
		const child = new ViewStateContext(this.workspace, this.tangent)
		child.parent = this
		this.children.push(child)
		return child
	}

	getState(item: TreeNodeOrReference, createIfNone=false, allowUnhandled=true) {
		if (!item) return null
		const pathID = item.path
		let state = this.states.get(pathID)
		if (createIfNone && !state) {
			state = this.createNodeViewState(item, allowUnhandled)
			if (state) {
				if (this.customizeNewState) {
					this.customizeNewState(state)
				}
				this.states.set(pathID, state,)
			}
		}
		return state
	}

	dropState(node: TreeNode | string) {
		const key = typeof node === 'string' ? node : node.path
		const state = this.states.get(key)
		if (typeof state?.dispose === 'function') {
			state.dispose()
		}
		this.states.delete(key)
	}

	private createNodeViewState(item: TreeNodeOrReference, allowUnhandled=true) {

		let node: TreeNode = null

		if (isNode(item)) {
			node = item
		}
		else {
			if (isSubReference(item)) {
				throw "Taylor you dummy, you don't support sub-references yet!"
			}
			
			node = getNodeFromReference(item, this.workspace.directoryStore)
		}

		if (node instanceof NoteFile) {
			const noteViewState = new NoteViewState(this, node, NoteDetailMode.All)
			if (isReference(item)) {
				if (item.annotations) {
					noteViewState.annotations.set(item.annotations)
				}
			}
			return noteViewState
		}
		
		if (node instanceof Folder) {
			return new FolderViewState(this, node)
		}

		if (node instanceof Tag) {
			return new TagViewState(this, node)
		}

		if (node instanceof EmbedFile) {
			switch (node.embedType) {
				case EmbedType.Image:
					return new ImageViewState(node)
			}
		}

		if (node instanceof DataFile) {
			if (QueryInfo.isType(null, node)) {
				return new QueryViewState(this, node)
			}
		}

		console.error('No view state created for', item, 'will fall back to empty')

		return allowUnhandled ? new UnhandledViewState(node) : null
	}

	onTreeChange(change: TreeChange) {
		if (change.removed) {
			for (const removed of change.removed) {
				this.dropState(removed)
			}
		}

		if (change.moved) {
			for (const moved of change.moved) {
				const state = this.states.get(moved.oldPath)
				if (state) {
					this.states.delete(moved.oldPath)
					this.states.set(moved.node.path, state)
				}
			}
		}

		if (change.added) {
			// Shouldn't have states for these. If we do, they're probably bad.
			for (const added of change.added) {
				const node = this.workspace.directoryStore.get(added.path)
				if (!node) {
					this.dropState(added)
					continue
				}

				const state = this.getState(node)
				if (state && state.node !== node) {
					this.dropState(node)
					this.getState(node, true)
				}
				
			}
		}

		for (const child of this.children) {
			child.onTreeChange(change)
		}
	}
}
