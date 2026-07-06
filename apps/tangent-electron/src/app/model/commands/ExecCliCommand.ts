import type { Workspace } from "..";
import type { CommandContext } from "./Command";
import WorkspaceCommand from "./WorkspaceCommand";
import ExecCommandDialog from '../../modal/ExecCommandDialog.svelte'



export default class ExecCliCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, {group: 'Notes'}) // <---- this makes it available when editing notes
	}
	
	execute() {
		this.workspace.viewState.modal.push(ExecCommandDialog, {
			commands: this.workspace.workspaceSettings.value.externalCommands.getRawValues()
		})
	}

	getName() {
		return 'Execute CLI'
	}

	getLabel(){
		return 'Execute Commands'
	}

	getDefaultPaletteName() {
		return 'Run/Execute external CLI command'
	}

	getTooltip(context?: CommandContext) {
		return 'Execute a external CLI command with context of current file'
	}
}