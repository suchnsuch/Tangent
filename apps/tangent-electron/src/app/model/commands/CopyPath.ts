import type { TreeNode } from "common/trees"
import type { CommandContext } from "./Command"
import WorkspaceCommand from "./WorkspaceCommand"

interface CopyPathCommandContext extends CommandContext {
	node: TreeNode
}

export class CopyPathCommand extends WorkspaceCommand {

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
