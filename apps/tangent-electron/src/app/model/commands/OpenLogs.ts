import type Workspace from '../Workspace'
import type { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'

export default class OpenLogsCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace)
	}

	execute(_context) {
		this.workspace.api.file.showInFileBrowser('logs')
	}

	getLabel(context: CommandContext) {
		return 'Show Logs'
	}

	getTooltip(context?: CommandContext) {
		return 'Opens the folder containing Tangent\'s log file.'
	}
}