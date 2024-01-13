import type Workspace from '../Workspace'
import WorkspaceCommand from './WorkspaceCommand'
import type { CommandContext } from './Command'

export interface OpenPreferencesCommandContext extends CommandContext {
	section?: string
}

export default class OpenPreferencesCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, { shortcut: 'Mod+,' })
	}

	execute(context?: OpenPreferencesCommandContext) {
		const system = this.workspace.viewState.system

		if (system.showMenu.value) {
			system.showMenu.set(false)
		}
		else {
			system.showMenu.set(true)
			if (context?.section) {
				system.section.set(context.section)
			}
		}
	}

	getLabel(context: CommandContext) {
		return 'Open Preferences'
	}

	getTooltip(context: CommandContext) {
		return 'Opens the preference pane, allowing customization of settings.'
	}
}
