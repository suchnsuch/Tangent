import { SidebarMode } from 'common/SidebarState'
import type Workspace from '../Workspace'
import WorkspaceCommand from './WorkspaceCommand'

// TODO: Extend for right/left sidebar
export default class ToggleSidebarCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, { shortcut: 'Mod+Alt+[' })
	}

	execute(_context) {
		this.workspace.viewState.leftSidebar.mode.update(m => m === SidebarMode.pinned ? SidebarMode.closed : SidebarMode.pinned)
	}

	getChecked(_context) {
		return this.workspace.viewState.leftSidebar.mode.value === SidebarMode.pinned
	}

	getLabel(_context) {
		return 'Toggle Left Sidebar'
	}

	getTooltip(_context) {
		return 'Toggles the left sidebar open and closed.'
	}
}
