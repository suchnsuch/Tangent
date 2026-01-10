import { SidebarMode } from 'common/SidebarState'
import type Workspace from '../Workspace'
import WorkspaceCommand from './WorkspaceCommand'
import { wait } from '@such-n-such/core'
import { focusLeftSidebar } from 'app/utils/selection'

// TODO: Extend for right/left sidebar
export default class ToggleSidebarCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, { shortcut: 'Mod+Alt+[' })
	}

	execute(_context) {
		this.workspace.viewState.leftSidebar.mode.update(m => m === SidebarMode.pinned ? SidebarMode.closed : SidebarMode.pinned)
		if (this.workspace.viewState.leftSidebar.mode.value === SidebarMode.pinned) {
			wait().then(() => {
				console.log('looking for sidebar targets')
				focusLeftSidebar()
			})
		}
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
