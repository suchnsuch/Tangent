import { SidebarMode } from 'common/SidebarState'
import type Workspace from '../Workspace'
import WorkspaceCommand from './WorkspaceCommand'
import { wait } from '@such-n-such/core'

export function getLeftSidebarElement() {
	const target = document.querySelector('.sidebar.left')
	if (target instanceof HTMLElement) return target
	return null
}

export function focusLeftSidebar() {
	let target = document.querySelector('.sidebar.left .FileTreeItem.isSelected')
	if (!target) target = document.querySelector('.sidebar.left .FileTreeItem.isParent')
	if (!target) target = document.querySelector('.sidebar.left .FileTreeItem:first-child')
	if (target instanceof HTMLElement) {
		target.focus()
		return true
	}
	return false
}

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
