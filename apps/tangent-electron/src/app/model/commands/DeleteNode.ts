import type { TreeNode } from 'common/trees'
import type { Workspace } from "..";
import type { CommandContext } from "./Command";
import WorkspaceCommand from "./WorkspaceCommand";
import { isMac } from 'common/platform';

interface DeleteNodeCommandContext extends CommandContext {
	target?: TreeNode | string
}

export default class DeleteNodeCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace)
	}

	execute(context: DeleteNodeCommandContext) {
		let target = context?.target ?? this.workspace.viewState.tangent.currentNode.value
		if (typeof target !== 'string') {
			target = target.path
		}

		this.workspace.api.file.delete(target)
	}

	getLabel(context: DeleteNodeCommandContext) {
		const target = context?.target ?? this.workspace.viewState.tangent.currentNode.value
		if (target && typeof target !== 'string') {
			return `Delete "${target.name}"`
		}
		return 'Delete File'
	}

	getTooltip(context?: CommandContext) {
		if (isMac) {
			return 'Deletes the file from the workspace. The file will be moved to the Trash.'
		}
		return 'Deletes the file from the workspace. The file will be moved to the Recycling Bin.'
	}
}
