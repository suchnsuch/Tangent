import { shortcutToElectronShortcut } from 'app/utils/shortcuts'
import type { Workspace } from '.'
import type { AnyCommandContext } from './commands/Command'
import type WorkspaceCommand from './commands/WorkspaceCommand'
import { isMac } from 'common/platform'
import type { TangentRoleOptions } from 'common/menus'
import type { WorkspaceCommandContext } from './commands/WorkspaceCommand'

export interface ContextMenuCommand {
	command?: WorkspaceCommand
	commandContext?: AnyCommandContext,
	click?: () => void
}

export interface MenuItemConstructorOptions extends ContextMenuCommand, TangentRoleOptions {
	id?: string
	type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio',
	role?: 'about'|'services'|'hide'|'hideOthers'|'unhide'|'quit'|'windowMenu'|'help'|'startSpeaking'|'stopSpeaking'|'toggleDevTools'
	label?: string
	toolTip?: string

	/** An external link to open */
	link?: string
	
	enabled?: boolean
	checked?: boolean

	submenu?: MenuItemConstructorOptions[]
}

export interface ContextMenuConstructorOptions extends MenuItemConstructorOptions {
	/** @deprecated Use workspace commands instead */
	accelerator?: string

	submenu?: ContextMenuConstructorOptions[]
}

export interface SplitContextMenuTemplate {
	top?: ContextMenuConstructorOptions[]
	middle?: ContextMenuConstructorOptions[]
	bottom?: ContextMenuConstructorOptions[]
}

interface ContextMenuContext extends SplitContextMenuTemplate {
	commands: Map<string, ContextMenuCommand>
}

export type ExtendedContextEvent = MouseEvent & SplitContextMenuTemplate

export function appendContextTemplate(event: ExtendedContextEvent, template: ContextMenuConstructorOptions[], section: 'top' | 'middle' | 'bottom' = 'top') {
	const t = (event[section] = event[section] ?? []) as ContextMenuConstructorOptions[]

	t.push({ type: 'separator' })
	for (const item of template) {
		t.push(item)
	}
}

export function extractRawTemplate(template: SplitContextMenuTemplate): SplitContextMenuTemplate {
	return {
		top: template.top,
		middle: template.middle,
		bottom: template.bottom
	}
}

export function prepareContextMenuCommands(template: SplitContextMenuTemplate | ContextMenuConstructorOptions[]): ContextMenuContext {
	const context: ContextMenuContext = {
		commands: new Map()
	}

	if (Array.isArray(template)) {
		context.top = template
	}
	else {
		context.top = template.top
		context.middle = template.middle
		context.bottom = template.bottom
	}

	let commandIDCount = 0

	function recursiveConverter(item: ContextMenuConstructorOptions) {

		if (item.command || item.click) {

			const command = item.command
			const commandContext = item.commandContext || {}
			const click = item.click

			delete item.command
			delete item.commandContext
			delete item.click

			if (command) {
				if (!command.canExecute(commandContext)) {
					// Do the can execute processing now
					item.enabled = false
				}

				const tooltip = command.getTooltip(commandContext)
				if (tooltip) {
					item.toolTip = tooltip
				}

				const checked = command.getChecked(commandContext)
				if (checked != null) {
					item.checked = checked
					if (!item.type) {
						item.type = 'checkbox'
					}
				}

				if (!item.label) {
					const label = command.getLabel(commandContext)
					if (label) {
						item.label = label
					}
					else {
						console.error('Items need labels!', item, command, commandContext)
					}
				}

				if (item.accelerator === undefined && command.shortcuts?.length > 0) {
					item.accelerator = command.shortcuts[0]
				}
			}				

			item.id = 'context_' + commandIDCount++
			context.commands.set(item.id, {
				command, commandContext, click
			})
		}

		if (item.accelerator) {
			(item as any).registerAccelerator = false
			item.accelerator = item.accelerator.replace(/Mod/ig, 'CommandOrControl')
		}

		if (Array.isArray(item.submenu)) {
			for (const sub of item.submenu) {
				recursiveConverter(sub)
			}
		}
	}

	if (context.top) {
		for (const item of context.top) {
			recursiveConverter(item)
		}
	}

	if (context.middle) {
		for (const item of context.middle) {
			recursiveConverter(item)
		}
	}
	
	if (context.bottom) {
		for (const item of context.bottom) {
			recursiveConverter(item)
		}
	}

	return context
}

export function buildMainMenu(workspace: Workspace): MenuItemConstructorOptions[] {

	const cmds = workspace.commands

	const template: MenuItemConstructorOptions[] = []

	if (isMac) {
		template.push({
			label: 'Tangent',
			submenu: [
				{ role: 'about' },
				{ tangentRole: 'checkForUpdates' },
				{ type: 'separator' },
				{ command: cmds.openPreferences },
				{ type: 'separator' },
				{ role: 'services' },
				{ type: 'separator' },
				{ role: 'hide' },
				{ role: 'hideOthers' },
				{ role: 'unhide' },
				{ type: 'separator' },
				{ role: 'quit' }
			]
		})
	}
	
	template.push({
		label: 'File',
		submenu: [
			{ command: cmds.createNewFile },
			{
				label: 'Create New Note From Rule',
				command: cmds.createNewNoteFromRule
			},
			{
				label: 'Save',
				command: cmds.saveCurrentFile
			},
			{
				label: 'Duplicate',
				command: cmds.duplicateNode
			},
			{ type: 'separator' },
			{ command: cmds.closeCurrentFile },
			{ command: cmds.closeOtherFiles },
			{ command: cmds.closeLeftFiles },
			{ command: cmds.closeRightFiles },
			{ type: 'separator' },
			{ command: cmds.openWorkspace }
		]
	})

	const editMenu: MenuItemConstructorOptions[] = [
		{ command: cmds.undo },
		{ command: cmds.redo },
		{ type: 'separator' },
		{ command: cmds.cut },
		{ command: cmds.copy },
		{ command: cmds.paste },
		{ command: cmds.pasteAndMatchStyle },
		{ command: cmds.selectAll },
		{ type: 'separator' },
		{
			label: 'Formatting',
			submenu: [
				{ command: cmds.toggleBold },
				{ command: cmds.toggleItalics },
				{ command: cmds.toggleHighlight },
				{ command: cmds.toggleInlineCode },
				{ type: 'separator' },
				{ command: cmds.setParagraph },
				{ command: cmds.setHeader1 },
				{ command: cmds.setHeader2 },
				{ command: cmds.setHeader3 },
				{ command: cmds.setHeader4 },
				{ command: cmds.setHeader5 },
				{ command: cmds.setHeader6 }
			]
		},
		{
			label: 'Links',
			submenu: [
				{ command: cmds.toggleWikiLink },
				{ command: cmds.toggleMDLink }
			]
		},
		{ type: 'separator' },
		{ command: cmds.shiftLinesUp },
		{ command: cmds.shiftLinesDown },
		{ command: cmds.shiftGroupUp },
		{ command: cmds.shiftGroupDown }
	]

	if (!isMac) {
		editMenu.push({
			command: cmds.openPreferences,
			click: () => {
				// Delay opening so menus know not be a derp
				setTimeout(() => {
					cmds.openPreferences.execute()
				}, 100)
			}
		})
	}

	template.push(
		{
			label: 'Edit',
			submenu: editMenu
		},
		{
			label: 'View',
			submenu: [
				{
					command: cmds.setMapFocusLevel
				},
				{
					command: cmds.setThreadFocusLevel
				},
				{
					label: 'Toggle Focus',
					command: cmds.toggleFocusMode
				},
				{
					label: '    File',
					command: cmds.setFileFocusLevel
				},
				{
					label: '    Typewriter',
					command: cmds.setTypewriterFocusLevel
				},
				{
					label: '    Paragraph',
					command: cmds.setParagraphFocusLevel
				},
				{
					label: '    Sentence',
					command: cmds.setSentenceFocusLevel
				},
				{ command: cmds.openDetails },
				{ type: 'separator' },
				{ command: cmds.collapseCurrentSection },
				{ command: cmds.collapseAllSections },
				{ command: cmds.expandAllSections },
				{ command: cmds.collapseSmallestSections },
				{ command: cmds.expandLargestSections },
				{ type: 'separator' },
				{
					label: 'Show Left Sidebar',
					command: cmds.toggleLeftSidebar,
				},
				{ type: 'separator' },
				{ command: cmds.zoomIn },
				{ command: cmds.zoomOut },
				{ command: cmds.resetZoom },
				{ type: 'separator' },
				{ command: cmds.floatWindow },
				{ command: cmds.fullscreenWindow },
			]
		},
		{
			label: 'Go',
			submenu: [
				{ command: cmds.shiftHistoryBack, label: 'Go Back' },
				{ command: cmds.shiftHistoryForward, label: 'Go Forward' },
				{ type: 'separator' },
				{ command: cmds.goTo },
				{ command: cmds.openQueryPane },
				{ command: cmds.openInFileBrowser },
				{ command: cmds.moveToLeftFile },
				{ command: cmds.moveToRightFile },
			]
		}
	)

	const doMenu: MenuItemConstructorOptions = {
		label: 'Do',
		submenu: [
			{ command: cmds.do }
		]
	}

	if (isMac) {
		doMenu.submenu.push({
			label: 'Speech',
			submenu: [
				{ role: 'startSpeaking' },
				{ role: 'stopSpeaking' }
			]
		})
	}

	template.push(doMenu)

	if (isMac) {
		template.push({ role: 'windowMenu' })
	}

	template.push({
		label: 'Help',
		role: 'help',
		submenu: [
			{ command: cmds.openDocumenation },
			{ command: cmds.openChangelog },
			{ type: 'separator' },
			{
				label: 'Tangent\'s Website',
				link: 'http://tangentnotes.com'
			},
			{
				label: 'Email Tangent\'s Team',
				link: `mailto:contact@tangentnotes.com?subject=Tangent v${workspace.version}`
			},
			{ type: 'separator' },
			{
				label: 'Tangent on Discord',
				link: 'https://discord.gg/6VpvhUnxFe'
			},
			{
				label: 'Tangent on Mastodon',
				link: 'https://mastodon.social/@tangentnotes'
			},
			{ type: 'separator' },
			{ command: cmds.openLogs },
			{ role: 'toggleDevTools' }
		]
	})

	return template
}

export function prepareMainMenuForWindow(template: MenuItemConstructorOptions[]) {
	function recursiveConverter(item: MenuItemConstructorOptions) {

		if (item.command) {
			const checked = item.command.getChecked(item.commandContext)
			if (checked != null && !item.type) {
				item.type = 'checkbox'
			}
		}

		if (item.submenu) {
			for (const subItem of item.submenu) {
				recursiveConverter(subItem)
			}
		}
	}

	for (const item of template) {
		recursiveConverter(item)
	}

	return template
}

export function prepareMainMenuForElectron(template: MenuItemConstructorOptions[]) {

	const context: WorkspaceCommandContext = {
		context: 'main-menu'
	}

	function recursiveConverter(item: MenuItemConstructorOptions) {
		if (item.commandContext) {
			console.error('Main Menu items may not have additional context', item)
			delete item.commandContext
		}
		// Clicks are not allowed, but not an error
		if (item.click) delete item.click

		const command = item.command
		if (command) {
			delete item.command // Can't send commands
			if (!command.id) console.error('Commands must have IDs', command.getName())
			item.id = 'window_' + command.id

			item.label = item.label ?? command.getLabel(context)
			if (!item.label) {
				console.error('Main Menu items need labels!', item)
			}

			item.toolTip = item.toolTip ?? command.getTooltip(context)
			const checked = command.getChecked()
			if (checked !== null) {
				item.checked = checked
				if (!item.type) {
					item.type = 'checkbox'
				}
			}

			if (command.shortcuts?.length) {
				;(item as any).registerAccelerator = false
				;(item as any).accelerator = shortcutToElectronShortcut(command.shortcuts[0])
			}
		}
		else if (item.link) {
			if (!item.label) console.error('Menu link items must have a label!', item)
		}
		else if (Array.isArray(item.submenu)) {
			for (const sub of item.submenu) {
				recursiveConverter(sub)
			}
		}
		else if (item.type === 'separator' || item.role || item.tangentRole) {
			// this is fine
		}
		else {
			console.error('Menu items must have a `command`, `link`, `submenu`, `role`, `tangentRole`, or be of `type: submenu`!', item)
		}
	}

	for (const item of template) {
		recursiveConverter(item)
	}

	return template
}
