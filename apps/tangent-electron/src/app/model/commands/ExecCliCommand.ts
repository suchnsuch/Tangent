import type { Workspace } from "..";
import type { CommandContext } from "./Command";
import WorkspaceCommand from "./WorkspaceCommand";
import ExecCommandDialog from '../../modal/ExecCommandDialog.svelte'



export default class ExecCliCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, {group: 'Notes'}) // <---- this makes it available when editing notes
	}
	
	execute() {
		const exts = ['.sh', '.bat']
		const workspaceRoot = this.workspace.viewState.directoryView.root.path

		this.workspace.api.file.findFiles(workspaceRoot, exts).then(files => {
			this.workspace.viewState.modal.push(ExecCommandDialog, {
				scripts: files.map(f => ({
					name: f.split('.').slice(0, -1).join(''),
					file: f,
					path: `${workspaceRoot}/${f}`
				}))
			})
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