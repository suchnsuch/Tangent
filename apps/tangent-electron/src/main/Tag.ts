import { last } from '@such-n-such/core';
import { tokenizeTagName } from '@such-n-such/tangent-query-parser';
import { getTagPath, TagTreeNode } from 'common/indexing/TagNode';
import { shallowCopyTreeNodeWithoutChildren, TreeNode } from 'common/trees';
import WorkspaceTreeNode from './WorkspaceTreeNode'

export default class Tag extends WorkspaceTreeNode implements TagTreeNode {
	names: string[]

	children?: TreeNode[]

	constructor(tagName: string | string[]) {
		const names = Array.isArray(tagName) ? tagName : tokenizeTagName(tagName)
		super({
			path: getTagPath(names),
			name: last(names),
			fileType: 'tag'
		})

		this.names = names
	}

	createShallowCopy?(): TreeNode {
		const result = shallowCopyTreeNodeWithoutChildren(this, false) as TagTreeNode
		result.names = this.names
		return result
	}
}
