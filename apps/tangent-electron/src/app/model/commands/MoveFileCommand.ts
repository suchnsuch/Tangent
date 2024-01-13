import type { TreeNode } from 'common/trees'
import paths from "common/paths";
import type { Workspace } from "..";
import type { CommandContext } from "./Command";
import WorkspaceCommand from "./WorkspaceCommand";
import MoveFileDialog from '../../modal/MoveFileDialog.svelte'

interface MoveFileCommandContext extends CommandContext {
	subject?: TreeNode | string,
	target?: TreeNode | string
}

export default class MoveFileCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace)
	}

	execute(context?: MoveFileCommandContext) {
		let { subject, target } = context ?? {}

		if (!subject) {
			subject = this.workspace.viewState.tangent.currentNode.value
		}

		if (typeof subject !== 'string') {
			subject = subject.path
		}

		if (!target) {
			this.workspace.viewState.modal.push(MoveFileDialog, {
				subject: this.workspace.directoryStore.get(subject)
			})
			return
		}
		else {
			let targetNode: TreeNode, targetPath: string
			if (typeof target === 'string') {
				targetNode = this.workspace.directoryStore.get(target)
				targetPath = target
			}
			else {
				targetNode = target
				targetPath = target.path
			}

			if (targetPath === subject) {
				console.error('Not allowed to move something to itself:', targetPath)
				return
			}

			// If the target is a folder, create a new path that places the
			// file in the folder
			if (targetNode && targetNode.fileType === 'folder') {
				targetPath = paths.join(targetNode.path, paths.basename(subject))
			}
			
			this.workspace.api.move(subject, targetPath)
		}
	}

	getDefaultPaletteName() {
		return 'Move File to another folder'
	}

	getTooltip(context?: CommandContext) {
		return 'Moves the file to a different folder in the workspace.'
	}
}