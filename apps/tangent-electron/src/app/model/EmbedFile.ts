import type { TreeNode } from 'common/trees'
import WorkspaceTreeNode from './WorkspaceTreeNode'
import type Workspace from './Workspace'
import { EmbedType, getEmbedType } from 'common/embedding'

export default class EmbedFile extends WorkspaceTreeNode {
	constructor(node: TreeNode, workspace: Workspace) {
		super(node, workspace)
	}

	get embedType() {
		return getEmbedType(this)
	}

	// A url that will bust through caches.
	// Best for images, audio, etc.
	get cacheBustPath() {
		return this.api.getUrl(this.path, this.modified)
	}

	canCopyToClipboard() {
		return this.embedType === EmbedType.Image && this.fileType.match(/(png|jpeg|jpg)/i) !== null
	}

	canUpdateFromClipboard() {
		return this.canCopyToClipboard()
	}

	copyToClipboard() {
		if (this.canCopyToClipboard()) {
			switch (this.embedType) {
				case EmbedType.Image:
					return this.workspace.api.system.copyImageToClipboard(this.path)
			}
		}
	}

	updateFromClipboard() {
		if (this.canUpdateFromClipboard()) {
			switch (this.embedType) {
				case EmbedType.Image:
					return this.workspace.api.system.updateImageFromClipboard(this.path)
			}
		}
	}
}
