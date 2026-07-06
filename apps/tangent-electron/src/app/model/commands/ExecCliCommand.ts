import type { Workspace } from ".."
import type { CommandContext } from "./Command"
import WorkspaceCommand from "./WorkspaceCommand"
import ExecCommandDialog from '../../modal/ExecCommandDialog.svelte'
import type ExternalCommandRule from "common/settings/ExternalCommand"
import { ShellEscape } from "app/utils/shell"
import type { ExternalCommandRuleDefinition } from "common/settings/ExternalCommand"
import type { NoteViewState } from "../nodeViewStates"


export function runExternalCommand(workspace: Workspace, rule: ExternalCommandRuleDefinition){
	const currentViewState = workspace.viewState.tangent.getCurrentViewState()
	const ctx = {
		'file': currentViewState.node.path, 
		'workspace': workspace.viewState.directoryView.root.path,
		'cursor': currentViewState.node.fileType == '.md' ? (currentViewState as NoteViewState).selection.value.join(',') : 'nan,nan',
		'thread': '...'
	}
	const shellEscaper = new ShellEscape({shell: 'bash', quote: true}) // TODO change this according to the OS
	let cmd = rule.commandTemplate.replace(/%([^%]*?)%/g, (match, expr) => shellEscaper.escape(ctx[expr]))
	workspace.api.os.execCLI(cmd)
}

interface ExecCliCommandContext extends CommandContext {
	rule?: ExternalCommandRule
}

export default class ExecCliCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, {group: 'Notes'}) // <---- this makes it available when editing notes
	}
	
	canExecuteFromShortcut(shortcut: string, context?: ExecCliCommandContext): boolean {
		if (!super.canExecuteFromShortcut(shortcut, context)) {
			for (const rule of this.workspace.workspaceSettings.value.externalCommands.value) {
				if (rule.shortcut.value === shortcut) {
					if (context) context.rule = rule
					if (this.canExecute(context)) {
						return true
					}
				}
			}
			if (context) delete context.rule
			return false
		}
		return true
	}

	execute(context: ExecCliCommandContext) {
		if (context.rule){
			runExternalCommand(this.workspace, context.rule.getDefinition())
		}
		else {
			this.workspace.viewState.modal.push(ExecCommandDialog, {
				commands: this.workspace.workspaceSettings.value.externalCommands.getRawValues()
			})
		}
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