import { swapRemove } from '@such-n-such/core'
import paths from 'common/paths'
import type { TreeChange, TreeNode } from 'common/trees'
import { getNodeFromReference, isNode, isSubReference, TreeNodeOrReference, TreeNodeReference } from 'common/nodeReferences'
import type Workspace from '../Workspace'
import type NodeViewState from './NodeViewState'
import type { Tangent } from '..'
import UnhandledViewState from './UnhandledViewState'
import File from '../File'

export type ViewStateContextCreator = (workspace: Workspace, tangent: Tangent, parent: ViewStateContext) => ViewStateContext
export type ViewStateCreator = (context: ViewStateContext, node: TreeNode, reference: TreeNodeReference) => NodeViewState

// This would create a great "broadcast" source for ViewStates
export default class ViewStateContext {

	readonly workspace: Workspace
	readonly tangent: Tangent

	readonly parent: ViewStateContext = null
	children: ViewStateContext[] = []

	// In theory, this would eventually let plugins define their own creation methods
	creators: ViewStateCreator[] = null

	private states: Map<string, NodeViewState> = new Map()

	constructor(workspace: Workspace, tangent: Tangent, parent: ViewStateContext = null) {
		this.workspace = workspace
		this.tangent = tangent
		this.parent = parent
	}

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

	createChild(creator?: ViewStateContextCreator) {

		const child = creator
			? creator(this.workspace, this.tangent, this)
			: new ViewStateContext(this.workspace, this.tangent, this)

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

	getRelativePersistentStateDirectory(): string | null {
		const result = this.workspace.directoryStore.pathToRelativePath(paths.dirname(this.tangent.tangentInfoFile.path))
		return result === false ? null : paths.join(result, 'state')
	}

	getOrCreatePersistentUuidFile(node: TreeNode, fileType: string): File | null {
		if (!node.meta?.uuid) {
			// TODO: Does this need to be handled?
			console.error('No UUID for', node.path)
			return null
		}
		const directory = this.getRelativePersistentStateDirectory()
		if (!directory) return null

		return this.workspace.commands.createNewFile.execute({
			relativePath: paths.join(directory, node.meta?.uuid + fileType),
			creationMode: 'createOrOpenCaseInsensitive',
			updateSelection: false
		}) as File
	}

	protected createNodeViewState(item: TreeNodeOrReference, allowUnhandled=true): NodeViewState {

		let node: TreeNode = null
		let reference: TreeNodeReference = null

		if (isNode(item)) {
			node = item
		}
		else {
			reference = item
			if (isSubReference(item)) {
				throw "Taylor you dummy, you don't support sub-references yet!"
			}
			
			node = getNodeFromReference(item, this.workspace.directoryStore)
		}

		let context: ViewStateContext = this
		while (context) {
			if (context.creators) {
				for (const creator of context.creators) {
					const state = creator(this, node, reference)
					if (state) return state
				}		
			}
			context = context.parent
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

		for (const state of this.states.values()) {
			if (state.onTreeChange) state.onTreeChange(change)
		}

		for (const child of this.children) {
			child.onTreeChange(change)
		}
	}
}
