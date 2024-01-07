import type { TreeNode } from 'common/trees'
import WorkspaceTreeNode from './WorkspaceTreeNode'
import type Workspace from './Workspace'
import { getEmbedType } from 'common/embedding'
import { normalizeSeperators } from 'common/paths'

export default class EmbedFile extends WorkspaceTreeNode {
	constructor(node: TreeNode, workspace: Workspace) {
		super(node, workspace)
	}

	get embedType() {
		return getEmbedType(this)
	}

	get cacheBustPath() {
		// Separators are normalized to '/' because otherwise it breaks on Windows. You go Windows.
		// The query technique pulled from https://instructobit.com/tutorial/119/Force-an-image-to-reload-and-refresh-using-Javascript
		return normalizeSeperators(this.path + '?t=' + this.modified, '/')
	}
}
