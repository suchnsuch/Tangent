import type { TreeNode } from 'common/trees'
import WorkspaceTreeNode from "./WorkspaceTreeNode"

export default class Folder extends WorkspaceTreeNode {
	
	children: TreeNode[]

	constructor(node: TreeNode) {
		super(node)
		this.children = node.children || []
	}
}