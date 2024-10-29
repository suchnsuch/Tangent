import { validatePath, type TreeNode } from 'common/trees'
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
	constructor(workspace: Workspace) {
		super(workspace)
	}

	execute(context: CreateNewFolderCommandContext): Folder
	execute(context: CreateNewFolderCommandContext & { async: true }): Promise<Folder>
	execute(context: CreateNewFolderCommandContext & { async?: true }) {
		let { name, parent, updateSelection, creationMode } = context

		creationMode = creationMode ?? 'create'

		const { directoryStore, viewState } = this.workspace

		if (!parent) {
			parent = directoryStore.files
		}

		if (!name) {
			name = 'New Folder'
		}

		const validatedName = validatePath(name)
		if (!validatedName) {
			console.error('Could not validate the folder name: \"' + name + '\"')
			return
		}
		name = validatedName

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

		const { node: newNode, onComplete } = this.workspace.createTreeNode({
			node: newRawNode, paired: true
		})

		if (updateSelection ?? true) {
			viewState.tangent.updateThread({ currentNode: newNode, thread: 'retain' })
			viewState.directoryView.toggleOpen(newNode)
		}

		if (context.async) {
			return onComplete.then(() => {
				return newNode as Folder
			})
		}

		return newNode as Folder
	}

	getLabel(content: CreateNewFolderCommandContext) {
		return 'Create New Folder'
	}

	getTooltip(context: CreateNewFolderCommandContext) {
		return 'Creates a new folder.'
	}
}