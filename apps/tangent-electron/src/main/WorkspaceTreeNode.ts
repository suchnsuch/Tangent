import type { TreeNode } from 'common/trees'
import type { IndexData } from 'common/indexing/indexTypes'

export default class WorkspaceTreeNode implements TreeNode {
	path: string
	name: string
	fileType: string
	depth: number

	created: Date
	modified: Date

	meta: IndexData

	state: 'idle' | 'loaded' | 'deleted'

	constructor(node: TreeNode) {
		this.path = node.path
		this.name = node.name
		this.fileType = node.fileType
		this.depth = node.depth

		this.created = node.created
		this.modified = node.modified

		this.meta = node.meta

		this.state = 'idle'
	}

	onExternalChange() {
		// Implemented in children
	}
}