import type { Workspace } from "..";
import type { CommandContext } from "./Command";
import WorkspaceCommand from "./WorkspaceCommand";
import ExecCommandDialog from '../../modal/ExecCommandDialog.svelte'
import type { NoteViewState } from "../nodeViewStates";


export default class ExecCliCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, {group: 'Notes'}) // <---- this makes it available when editing notes
	}
	
	execute() {
		const exts = ['.sh', '.bat']
		const workspaceRoot = this.workspace.viewState.directoryView.root.path
		const subject = this.workspace.viewState.tangent.currentNode.value
		let vw = this.workspace.viewState.tangent.getCurrentViewState() as NoteViewState
		console.log(">>>>>>>>> ", vw.selection.value)

		this.workspace.api.file.findFiles(workspaceRoot, exts).then(files => {
			this.workspace.viewState.modal.push(ExecCommandDialog, {
				subject,
				workspaceRoot,
				scripts: files.map(f => ({
					name: f.split('.').slice(0, -1).join(''),
					file: f,
					path: `${workspaceRoot}${f}`
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