import { tokenizeTagName } from '@such-n-such/tangent-query-parser'
import type { TreeNode } from 'common/trees'

export function getTagPath(names: string[])
export function getTagPath(name: string)
export function getTagPath(names: string | string[]) {
	if (typeof names === 'string') {
		names = tokenizeTagName(names)
	}
	return '#/' + names.map(n => n.toLocaleUpperCase()).join('/')
}

export interface TagTreeNode extends TreeNode {
	names: string[]
}

export function isTagTreeNode(node: TreeNode): node is TagTreeNode {
	if ('names' in node) return true
	return false
}
