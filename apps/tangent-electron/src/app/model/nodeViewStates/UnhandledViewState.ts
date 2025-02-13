import { TreeNode } from 'common/trees'
import NodeViewState from './NodeViewState'
import { ReadableStore } from 'common/stores'
import LensViewState from './LensViewState'
import UnhandledView from 'app/views/node-views/UnhandledView.svelte'

/**
 * The view state to use when no proper view state can be created
 */
export default class UnhandledViewState implements NodeViewState, LensViewState {
	readonly node: TreeNode
	readonly currentLens: ReadableStore<LensViewState>
	
	constructor(node: TreeNode) {
		this.node = node
		this.currentLens = new ReadableStore<LensViewState>(this)
	}

	get parent() { return this }
	get viewComponent() { return UnhandledView }
}
