import type { TreeNode, DirectoryStore } from 'common/trees'

const treeNodeType = 'tangent/treenode'

export function setTreeNodeTransfer(transfer: DataTransfer, node: TreeNode) {
	transfer.setData(treeNodeType, node.path)
	transfer.effectAllowed = 'all'
}

export function hasTreeNodeTransfer(transfer: DataTransfer) {
	return transfer.types.includes(treeNodeType)
}

export function getTreeNodeTransfer(transfer: DataTransfer, directory: DirectoryStore) {
	return directory.get(transfer.getData(treeNodeType))
}
