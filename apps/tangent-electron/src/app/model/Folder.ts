import paths from 'common/paths'
import type { TreeNode } from 'common/trees'
import type DataFile from './DataFile'
import type Workspace from "./Workspace"
import WorkspaceTreeNode from "./WorkspaceTreeNode"

export default class Folder extends WorkspaceTreeNode {

	children: TreeNode[]

	constructor(node: TreeNode, workspace: Workspace) {
		super(node, workspace)
		this.children = node.children || []
	}

	getFolderInfoFile() {
		let infoFile = this.workspace.commands.createNewFile.execute({
			name: '.tangentfolder',
			folder: this,
			extension: false,
			creationMode: 'createOrOpen',
			updateSelection: false
		}) as DataFile

		if (!infoFile) {
			throw new Error('Could not create new .tangentfolder for: ' + this.path)
		}

		return infoFile
	}

	*visibleChildren() {
		for (const child of this.children) {
			if (child.name.startsWith('.')) continue
			yield child
		}
	}

	getFullPath(relativePath: string): string {
		return paths.join(this.path, relativePath)
	}

	resolveRelativePath(relativePath: string): TreeNode {
		return this.workspace.directoryStore.get(this.getFullPath(relativePath))
	}
}
