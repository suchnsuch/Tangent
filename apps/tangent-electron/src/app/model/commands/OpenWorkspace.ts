import type { Workspace } from '..'
import WorkspaceCommand from './WorkspaceCommand'

export default class OpenWorkspaceCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, { shortcut: 'Mod+Shift+O'})
	}

	execute(_context) {
		this.workspace.api.window.create()
	}

	getLabel(_context) {
		return 'Open Workspace'
	}

	getTooltip(_context) {
		return 'Opens a new window that can be opened to any workspace or folder.'
	}
}