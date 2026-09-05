import type { TreeNode } from "common/trees"
import type { CommandContext } from "./Command"
import WorkspaceCommand from "./WorkspaceCommand"

interface CopyPathCommandContext extends CommandContext {
	node: TreeNode
}

function copyTooltip(what: string): string {
	return `Copies "${what}" to the clipboard.`
}

export class CopyAbsolutePathCommand extends WorkspaceCommand {

	resolveNode(context?: CopyPathCommandContext) {
		return context?.node ?? this.workspace.viewState.tangent.currentNode.value
	}

	canExecute(context?: CopyPathCommandContext): boolean {
		return this.resolveNode(context) != null
	}

	getPath(node: TreeNode): string {
		return node.path
	}

	execute(context?: CopyPathCommandContext): void {
		const node = this.resolveNode(context)
		if (node) {
			navigator.clipboard.writeText(this.getPath(node))
		}
	}

	getLabel(context?: CopyPathCommandContext) {
		return 'Copy Full Path'
	}

	getTooltip(context?: CopyPathCommandContext) {
		const node = this.resolveNode(context)
		if (node) {
			return copyTooltip(this.getPath(node))
		}
	}
}

export class CopyRelativePathCommand extends WorkspaceCommand {

	resolveNode(context?: CopyPathCommandContext) {
		return context?.node ?? this.workspace.viewState.tangent.currentNode.value
	}

	canExecute(context?: CopyPathCommandContext): boolean {
		return this.resolveNode(context) != null
	}

	getPath(node: TreeNode): string {
		const workspaceAbsolutePath = this.workspace.viewState.directoryView.root.path
		const nodeAbsolutePath = node.path
		const nodeRelativePath = nodeAbsolutePath.substring(workspaceAbsolutePath.length)
		return nodeRelativePath
	}

	execute(context?: CopyPathCommandContext): void {
		const node = this.resolveNode(context)
		if (node) {
			navigator.clipboard.writeText(this.getPath(node))
		}
	}

	getLabel(context?: CopyPathCommandContext) {
		return 'Copy Relative Path'
	}
	
	getTooltip(context?: CopyPathCommandContext) {
		const node = this.resolveNode(context)
		if (node) {
			return copyTooltip(this.getPath(node))
		}
	}
}
