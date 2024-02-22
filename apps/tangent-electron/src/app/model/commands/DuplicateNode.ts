import { TreeNode, shallowCopyTreeNodeWithoutChildren } from 'common/trees'
import Workspace from '../Workspace'
import { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import paths from 'common/paths'
import { NavigationData } from 'app/events'

interface DuplicateNodeCommandContext extends CommandContext {
	target?: TreeNode
	newPath?: string
	selectNewFile?: boolean
}

export default class DuplicateNodeCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, {
			shortcut: 'Mod+Shift+D'
		})
	}

	execute(context?: DuplicateNodeCommandContext) {
		const target = context?.target ?? this.workspace.viewState.tangent.currentNode.value
		
		if (!target) {
			console.error('Cannot duplicate without a target node!')
		}

		const newPath = this.workspace.directoryStore.getUniquePath(context?.newPath ?? target.path)
		const task = this.workspace.api.file.copy(target.path, newPath)

		if (context?.selectNewFile ?? true) {
			// This ensures that duplicating a file means that once the text of the file
			// lands in the system, it gets pushed to us immediately.
			// Without waiting for the backend to have created the placeholder files, there is a disconnect.
			task.then(() => {
				const newNode = this.workspace.directoryStore.get(newPath)

				if (newNode) {
					const nav: NavigationData = {
						target: newNode,
						direction: 'replace'
					}
					this.workspace.navigateTo(nav)
				}
			})
		}

		return task
	}

	getLabel(context?: DuplicateNodeCommandContext) {
		const target = context?.target ?? this.workspace.viewState.tangent.currentNode.value
		if (target) {
			return `Duplicate "${target.name}"`
		}
		return 'Duplicate File'
	}

	getTooltip(context?: CommandContext) {
		return 'Duplicates the file.'
	}
}