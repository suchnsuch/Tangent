import type { TreeNode } from "common/trees"
import type { CommandContext } from "./Command"
import WorkspaceCommand from "./WorkspaceCommand"

interface CopyPathCommandContext extends CommandContext {
	node: TreeNode
}

export class CopyAbsolutePathCommand extends WorkspaceCommand {

	resolveNode(context?: CopyPathCommandContext) {
		return context?.node ?? this.workspace.viewState.tangent.currentNode.value
	}

	canExecute(context?: CopyPathCommandContext): boolean {
		return this.resolveNode(context) != null
	}

	execute(context?: CopyPathCommandContext): void {
		const node = this.resolveNode(context)
		if (node) {
			navigator.clipboard.writeText(node.path)
		}
	}

	getLabel(context?: CopyPathCommandContext) {
		return 'Copy Full Path'
	}
}

export class CopyRelativePathCommand extends WorkspaceCommand {

	resolveNode(context?: CopyPathCommandContext) {
		return context?.node ?? this.workspace.viewState.tangent.currentNode.value
	}

	canExecute(context?: CopyPathCommandContext): boolean {
		return this.resolveNode(context) != null
	}

	execute(context?: CopyPathCommandContext): void {
		const node = this.resolveNode(context)
		if (node) {
			const workspaceAbsolutePath = this.workspace.viewState.directoryView.root.path
			const nodeAbsolutePath = node.path
			const nodeRelativePath = nodeAbsolutePath.substring(workspaceAbsolutePath.length)
			navigator.clipboard.writeText(nodeRelativePath)
		}
	}

	getLabel(context?: CopyPathCommandContext) {
		return 'Copy Relative Path'
	}
}
