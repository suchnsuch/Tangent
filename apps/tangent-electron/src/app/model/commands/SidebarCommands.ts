import type { TreeNode } from 'common/trees'
import { Workspace } from '..'
import type { CommandContext, CommandOptions } from './Command'
import WorkspaceCommand from './WorkspaceCommand'

export interface SidebarCommandContext extends CommandContext {
	currentItem: TreeNode
	setRenameTarget(node: TreeNode)
}

export class SidebarCommand extends WorkspaceCommand {

	constructor(workspace: Workspace, options: CommandOptions) {
		super(workspace, { group: 'Sidebar', ...options })
	}

	getPaletteActions() {
		return null
	}
}

export class RenameSidebarItem extends SidebarCommand {
	execute(context?: SidebarCommandContext) {
		if (!context) return
		context.setRenameTarget(context.currentItem)
	}

	getLabel(context?: CommandContext) {
		return 'Rename Sidebar Item'
	}
}

export class DeleteSidebarItem extends SidebarCommand {
	execute(context?: SidebarCommandContext): void {
		if (!context?.currentItem) {
			console.error('No current item in context', context)
			return
		}

		if (context.initiatingEvent.target instanceof HTMLElement) {
			const previous = context.initiatingEvent.target.previousElementSibling
			if (previous instanceof HTMLElement) {
				previous.focus()
			}
		}
		else if (context.initiatingEvent.target instanceof HTMLElement) {
			const next = context.initiatingEvent.target.nextElementSibling
			if (next instanceof HTMLElement) {
				next.focus()
			}
		}

		this.workspace.commands.deleteNode.execute({
			target: context.currentItem
		})
	}

	getLabel(context?: CommandContext) {
		return 'Delete Sidebar Item'
	}
}
