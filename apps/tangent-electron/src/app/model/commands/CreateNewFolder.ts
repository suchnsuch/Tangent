import type { TreeNode } from 'common/trees'
import paths from 'common/paths'
import type { Workspace } from '..'
import Folder from '../Folder'
import type { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import { CreationMode } from 'common/settings/CreationRule'

interface CreateNewFolderCommandContext extends CommandContext {
	name?: string
	parent?: TreeNode,
	updateSelection?: boolean,
	creationMode?: CreationMode
}

export default class CreateNewFolderCommand extends WorkspaceCommand {
	workspace: Workspace

	constructor(workspace: Workspace) {
		super(workspace)
	}

	execute(context: CreateNewFolderCommandContext): Folder {
		let { name, parent, updateSelection, creationMode } = context

		creationMode = creationMode ?? 'create'

		const { directoryStore, viewState } = this.workspace

		if (!parent) {
			parent = directoryStore.files
		}

		if (!name) {
			name = 'New Folder'
		}

		let newPath = paths.join(parent.path, name)

		const existingNode = directoryStore.get(newPath)
		if (existingNode) {
			if (!existingNode.meta?.virtual) {
				if (creationMode === 'createOrOpen' && existingNode.fileType === 'folder') {
					return existingNode as Folder
				}
				// Avoid naming collision with non-virtual folder
				let counter = 0
				while (directoryStore.has(newPath)) {
					counter++
					newPath = paths.join(parent.path, `${name} ${counter}`)
				}
			}
			else {
				// Virtual node will be replaced by a real one
				directoryStore.remove(existingNode)
			}
		}

		const newRawNode: TreeNode = {
			path: newPath,
			name: paths.basename(newPath),
			fileType: 'folder'
		}

		if (existingNode) {
			newRawNode.children = existingNode.children
		}

		const newNode = this.workspace.createTreeNode(newRawNode) as Folder

		if (updateSelection ?? true) {
			viewState.tangent.updateThread({ currentNode: newNode, thread: 'retain' })
			viewState.directoryView.toggleOpen(newNode)
		}

		return newNode
	}

	getLabel(content: CreateNewFolderCommandContext) {
		return 'Create New Folder'
	}

	getTooltip(context: CreateNewFolderCommandContext) {
		return 'Creates a new folder.'
	}
}