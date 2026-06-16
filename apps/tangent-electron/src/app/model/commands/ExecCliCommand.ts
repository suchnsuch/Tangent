import type { Workspace } from "..";
import type { CommandContext } from "./Command";
import WorkspaceCommand from "./WorkspaceCommand";
import ExecCommandDialog from '../../modal/ExecCommandDialog.svelte'


function removeSuffix(str, suffix) {
    if (str.endsWith(suffix)) 
        return str.slice(0, -suffix.length)
    return str
}

export default class ExecCliCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace)
	}

	execute() {
		const workspaceRoot = removeSuffix(this.workspace.workspaceFolder.path, '.tangent')
		const exts = ['.sh', '.bat']
		const subject = this.workspace.viewState.tangent.currentNode.value

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

	getDefaultPaletteName() {
		return 'Run/Execute external CLI command'
	}

	getTooltip(context?: CommandContext) {
		return 'Execute a external CLI command with context of current file'
	}
}