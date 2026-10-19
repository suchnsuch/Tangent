import type { TreeNode } from "common/trees"
import type { CommandContext } from "./Command"
import WorkspaceCommand from "./WorkspaceCommand"
import type Workspace from "../Workspace"

interface CopyPathCommandContext extends CommandContext {
	node: TreeNode
}

function copyTooltip(what: string): string {
	return `Copies "${what}" to the clipboard.`
}
function copyPath(workspace: Workspace, path: string) {
	navigator.clipboard.writeText(path)
	workspace.api.postMessage({ title: "Copy to clipboard", message: `'${path}' copied to clipboard`, type: 'info'})
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
			copyPath(this.workspace, this.getPath(node))
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
		return this.workspace.directoryStore.pathToRelativePath(node.path) || ''
	}

	execute(context?: CopyPathCommandContext): void {
		const node = this.resolveNode(context)
		if (node) {
			copyPath(this.workspace, this.getPath(node))
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