import type { TagTreeNode } from 'common/indexing/TagNode'
import type { TreeNode } from 'common/trees'
import type { Workspace } from '.'
import type DataFile from './DataFile'
import WorkspaceTreeNode from './WorkspaceTreeNode'

export default class Tag extends WorkspaceTreeNode {

	children?: Tag[]
	names: string[]

	constructor(node: TreeNode, workspace: Workspace) {
		super(node, workspace)

		const tag = node as TagTreeNode
		this.names = tag.names
	}

	getTagInfoFile() {
		const infoFile = this.workspace.commands.createNewFile.execute({
			name: this.names.join('.'),
			folder: this.workspace.tagsFolder,
			extension: '.taginfo',
			creationMode: 'createOrOpen',
			updateSelection: false
		}) as DataFile

		if (!infoFile) {
			throw new Error('Could not create new .taginfo for: ' + this.path)
		}

		return infoFile
	}
}
