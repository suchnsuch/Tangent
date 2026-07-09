import type { Workspace } from ".."
import type { CommandContext } from "./Command"
import WorkspaceCommand from "./WorkspaceCommand"
import ExecCommandDialog from '../../modal/ExecCommandDialog.svelte'
import type ExternalCommand from "common/settings/ExternalCommand"
import type { ExternalCommandDefinition } from "common/settings/ExternalCommand"
import type { NoteViewState } from "../nodeViewStates"


export function runExternalCommand(workspace: Workspace, command: ExternalCommandDefinition){
	const currentViewState = workspace.viewState.tangent.getCurrentViewState()
	const context = {
		'file': currentViewState.node.path, 
		'workspace': workspace.viewState.directoryView.root.path,
		'cursor': currentViewState.node.fileType == '.md' ? (currentViewState as NoteViewState).selection.value.join(',') : '-1,-1',
		// TODO add thread
	}
	workspace.api.os.execCLI(command.commandTemplate, context)
}

interface ExecuteExternalCommandContext extends CommandContext {
	command?: ExternalCommand
}

export default class ExecuteExternalCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, { group: 'Notes' }) // <---- this makes it available when editing notes
	}
	
	canExecuteFromShortcut(shortcut: string, context?: ExecuteExternalCommandContext): boolean {
		if (!super.canExecuteFromShortcut(shortcut, context)) {
			for (const command of this.workspace.workspaceSettings.value.externalCommands.value) {
				if (command.shortcut.value === shortcut) {
					if (context) context.command = command
					if (this.canExecute(context)) {
						return true
					}
				}
			}
			if (context) delete context.command
			return false
		}
		return true
	}

	execute(context: ExecuteExternalCommandContext) {
		if (context.command){
			runExternalCommand(this.workspace, context.command.getDefinition())
		}
		else {
			this.workspace.viewState.modal.push(ExecCommandDialog, {
				commands: this.workspace.workspaceSettings.value.externalCommands.getRawValues()
			})
		}
	}

	getPaletteActions() {
		const actions = [...super.getPaletteActions()]
		for (const command of this.workspace.workspaceSettings.value.externalCommands) {
			actions.push({
				name: `Execute "${command.name.value}"`,
				command: this,
				context: {
					command
				},
				shortcuts: command.shortcut.value ? [command.shortcut.value] : null
			})
		}
		return actions
	}

	getName() {
		return 'Execute Commands'
	}

	getLabel(){
		return 'Execute External Commands'
	}

	getDefaultPaletteName() {
		return 'Run/Execute External Commands'
	}

	getTooltip(context?: CommandContext) {
		return 'Execute a external command with context of current file and current workspace'
	}
}