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

	// A url path that will bust through caches.
	// Best for images, audio, etc.
	get cacheBustPath() {
		// Separators are normalized to '/' because otherwise it breaks on Windows. You go Windows.
		// The query technique pulled from https://instructobit.com/tutorial/119/Force-an-image-to-reload-and-refresh-using-Javascript
		const normalizedPath = normalizeSeperators(this.path, '/')
			// Fix people using `#` in paths (honestly surprised that's allowed by filesystems) for images
			.replace(/#/g, encodeURIComponent('#'))

		return normalizedPath + '?t=' + this.modified
	}
}
