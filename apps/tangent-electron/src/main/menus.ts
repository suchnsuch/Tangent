import { app, BrowserWindow, Menu, MenuItem, shell, WebContents, screen } from 'electron'
import type { MenuItemConstructorOptions } from 'electron/main'
import { checkForUpdates } from './updates'
import type WindowHandle from './WindowHandle'
import { isMac } from '../common/isMac'
import { mode } from './environment'
import { initDocumentation } from './documentation'

const windowPrefix = 'window_'

function actionPassthrough(item: MenuItem, browserWindow: BrowserWindow) {
	let id = item.id
	if (id && id.startsWith(windowPrefix)) {
		id = id.substring(windowPrefix.length)
	}
	browserWindow.webContents.send('onMenuAction', id)
}

export function createMenus(interop: {
	createWindow: () => void,
	getWindowHandle: (windowReference: BrowserWindow | WebContents) => WindowHandle,
	openDocumentation: (name: string) => void
}) {

	const template: Electron.MenuItemConstructorOptions[] = []

	if (isMac) {
		template.push({
			label: 'Tangent',
			submenu: [
				{ 'role': 'about' },
				{
					label: 'Check for Updates…',
					click: () => checkForUpdates()
				},
				{ type: 'separator' },
				{
					id: 'window_openPreferences',
					label: 'Preferences',
					accelerator: 'CommandOrControl+,',
					registerAccelerator: false,
					click: actionPassthrough
				},
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
			{
				id: 'window_createNewFile',
				label: 'New Note',
				accelerator: 'CommandOrControl+N',
				registerAccelerator: false,
				click: actionPassthrough,
			},
			{
				id: 'window_createNewNoteFromRule',
				label: 'New Note from Rule',
				accelerator: 'CommandOrControl+Shift+N',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{
				id: 'window_saveCurrentFile',
				label: 'Save',
				accelerator: 'CommandOrControl+S',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{
				id: 'window_duplicateNode',
				label: 'Duplicate',
				accelerator: 'CommandOrControl+Shift+D',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{ type: 'separator' },
			{
				id: 'window_closeCurrentFile',
				label: 'Close Note',
				accelerator: 'CommandOrControl+W',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{
				id: 'window_closeOtherFiles',
				label: 'Close Other Notes',
				accelerator: 'CommandOrControl+Shift+W',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{
				id: 'window_closeLeftFiles',
				label: 'Close Notes to the Left',
				click: actionPassthrough
			},
			{
				id: 'window_closeRightFiles',
				label: 'Close Notes to the Right',
				click: actionPassthrough
			},
			{ type: 'separator' },
			{
				label: 'Open Workspace',
				accelerator: 'CommandOrControl+Shift+O',
				registerAccelerator: false,
				click: () => {
					interop.createWindow()
				}
			},
			{
				label: 'Close Workspace',
				click: (item, browserWindow) => {
					browserWindow.close()
				}
			}
		]
	})

	// Edit
	const editMenu: MenuItemConstructorOptions[] = [
		{ role: 'undo' },
		{ role: 'redo' },
		{ type: 'separator' },
		{ role: 'cut' },
		{ role: 'copy' },
		{ role: 'paste' },
		{
			label: 'Paste Without Formatting',
			accelerator: 'CommandOrControl+Shift+V',
			click: (item, browserWindow) => {
				const handle = interop.getWindowHandle(browserWindow as BrowserWindow)
				if (handle) {
					handle.sendPastePlaintext()
				}
			}
		},
		{ role: 'selectAll' },
		{ type: 'separator' },
		{
			label: 'Formatting',
			submenu: [
				{
					id: 'window_toggleBold',
					label: 'Toggle Bold',
					accelerator: 'CommandOrControl+B',
					registerAccelerator: false,
					click: actionPassthrough
				},
				{
					id: 'window_toggleItalics',
					label: 'Toggle Italics',
					accelerator: 'CommandOrControl+I',
					registerAccelerator: false,
					click: actionPassthrough
				},
				{
					id: 'window_toggleHighlight',
					label: 'Toggle Highlight',
					accelerator: 'CommandOrControl+=',
					registerAccelerator: false,
					click: actionPassthrough
				},
				{
					id: 'window_toggleInlineCode',
					label: 'Toggle Inline Code',
					accelerator: 'CommandOrControl+\\',
					registerAccelerator: false,
					click: actionPassthrough
				},
				{ type: 'separator' },
				{
					id: 'window_setParagraph',
					label: 'Paragraph',
					accelerator: 'CommandOrControl+0',
					registerAccelerator: false,
					click: actionPassthrough
				},
				{
					id: 'window_setHeader1',
					label: 'Header 1',
					accelerator: 'CommandOrControl+1',
					registerAccelerator: false,
					click: actionPassthrough
				},
				{
					id: 'window_setHeader2',
					label: 'Header 2',
					accelerator: 'CommandOrControl+2',
					registerAccelerator: false,
					click: actionPassthrough
				},
				{
					id: 'window_setHeader3',
					label: 'Header 3',
					accelerator: 'CommandOrControl+3',
					registerAccelerator: false,
					click: actionPassthrough
				},
				{
					id: 'window_setHeader4',
					label: 'Header 4',
					accelerator: 'CommandOrControl+4',
					registerAccelerator: false,
					click: actionPassthrough
				},
				{
					id: 'window_setHeader5',
					label: 'Header 5',
					accelerator: 'CommandOrControl+5',
					registerAccelerator: false,
					click: actionPassthrough
				},
				{
					id: 'window_setHeader6',
					label: 'Header 6',
					accelerator: 'CommandOrControl+6',
					registerAccelerator: false,
					click: actionPassthrough
				}
			]
		},
		{
			label: 'Links',
			submenu: [
				{
					id: 'window_toggleWikiLink',
					label: 'Toggle Wiki Link',
					accelerator: 'CommandOrControl+Alt+K',
					registerAccelerator: false,
					click: actionPassthrough
				},
				{
					id: 'window_toggleMDLink',
					label: 'Toggle External Link',
					accelerator: 'CommandOrControl+K',
					registerAccelerator: false,
					click: actionPassthrough
				}
			]
		}
	]

	if (!isMac) {
		editMenu.push({
			id: 'window_openPreferences',
			label: 'Preferences',
			accelerator: 'CommandOrControl+,',
			registerAccelerator: false,
			click: actionPassthrough
		})
	}

	template.push({
		label: 'Edit',
		submenu: editMenu
	})

	// View
	template.push({
		label: 'View',
		submenu: [
			{
				id: 'window_setMapFocusLevel',
				label: 'Map View',
				type: 'checkbox',
				accelerator: 'CommandOrControl+G',
				registerAccelerator: false,
				click: actionPassthrough
			},

			{
				id: 'window_setThreadFocusLevel',
				label: 'Thread View',
				type: 'checkbox',
				click: actionPassthrough
			},

			{
				id: 'window_toggleFocusMode',
				label: 'Toggle Focus Mode',
				accelerator: 'CommandOrControl+D',
				click: actionPassthrough
			},
			{
				id: 'window_setFileFocusLevel',
				label: '    File',
				type: 'checkbox',
				click: actionPassthrough
			},
			{
				id: 'window_setTypewriterFocusLevel',
				label: '    Typewriter',
				type: 'checkbox',
				click: actionPassthrough
			},
			{
				id: 'window_setParagraphFocusLevel',
				label: '    Paragraph',
				type: 'checkbox',
				click: actionPassthrough
			},
			{
				id: 'window_setLineFocusLevel',
				label: '    Line',
				type: 'checkbox',
				click: actionPassthrough
			},
			{
				id: 'window_setSentenceFocusLevel',
				label: '    Sentence',
				type: 'checkbox',
				click: actionPassthrough
			},
			{
				id: 'window_showIncomingLinks',
				label: 'Show Incoming Links',
				accelerator: 'CommandOrControl+Alt+Down',
				registerAccelerator: false,
				click: actionPassthrough
			},

			{ type: 'separator' },

			{
				id: 'window_toggleLeftSidebar',
				label: 'Show Left Sidebar',
				accelerator: 'CommandOrControl+Alt+[',
				registerAccelerator: false,
				type: 'checkbox',
				click: actionPassthrough
			},

			{ type: 'separator' },

			{
				id: 'window_zoomIn',
				label: 'Zoom In',
				accelerator: 'CommandOrControl+Shift+Plus',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{
				id: 'window_zoomOut',
				label: 'Zoom Out',
				accelerator: 'CommandOrControl+Shift+numsub',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{
				id: 'window_resetZoom',
				label: 'Reset Zoom',
				accelerator: 'CommandOrControl+Shift+0',
				registerAccelerator: false,
				click: actionPassthrough
			},
			
			{ type: 'separator' },

			{
				id: 'window_floatWindow',
				label: 'Float Window',
				type: 'checkbox',
				click: actionPassthrough
			},

			{ type: 'separator' },

			{ role: 'forceReload' },
			{ role: 'toggleDevTools' },
			{ type: 'separator' },
			{ role: 'togglefullscreen' }
		]
	})
	
	// Go
	template.push({
		label: 'Go',
		submenu: [
			{
				id: 'window_shiftHistoryBack',
				label: 'Go Back',
				accelerator: 'CommandOrControl+Shift+[',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{
				id: 'window_shiftHistoryForward',
				label: 'Go Forward',
				accelerator: 'CommandOrControl+Shift+]',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{ type: 'separator' },
			{
				id: 'window_goTo',
				label: 'Go To File...',
				accelerator: 'CommandOrControl+O',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{
				id: 'window_openQueryPane',
				label: 'New Search Query',
				accelerator: 'CommandOrControl+Shift+F',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{
				id: 'window_showInFileBrowser',
				label: isMac ? 'Show in Finder' : 'Show in Explorer',
				click: actionPassthrough
			},
			{
				id: 'window_moveToLeftFile',
				label: 'Move to Left Note',
				accelerator: 'CommandOrControl+Alt+Left',
				registerAccelerator: false,
				click: actionPassthrough
			},
			{
				id: 'window_moveToRightFile',
				label: 'Move to Right Note',
				accelerator: 'CommandOrControl+Alt+Right',
				registerAccelerator: false,
				click: actionPassthrough
			}
		]
	})

	// Do
	const doMenu: MenuItemConstructorOptions[] = [
		{
			id: 'window_do',
			label: 'Show Command Palette',
			accelerator: 'CommandOrControl+P',
			registerAccelerator: false,
			click: actionPassthrough
		}
	]

	if (isMac) {
		doMenu.push({
			label: 'Speech',
			submenu: [
				{ role: 'startSpeaking' },
				{ role: 'stopSpeaking' }
			]
		})
	}
	
	template.push({
		label: 'Do',
		submenu: doMenu
	})

	if (isMac) {
		template.push({ role: 'windowMenu' })
	}

	if (mode === 'development') {
		template.push({
			label: 'Dev',
			submenu: [
				{
					label: 'Force Documentation Refresh',
					click() {
						initDocumentation(true)
					}
				},
				{
					label: 'Set Window to Screenshot Size',
					accelerator: 'CommandOrControl+Alt+S',
					click(item: MenuItem, browserWindow: BrowserWindow) {
						const oldBounds = browserWindow.getBounds()
						const width = 1280
						const height = 720
						browserWindow.setSize(width, height)

						const screenSize = screen.getDisplayMatching(oldBounds).size
						browserWindow.setPosition(
							Math.round((screenSize.width * .5) - width * .5),
							Math.round((screenSize.height * .5) - height * .5))
						
						browserWindow.webContents.closeDevTools()
					}
				}
			]
		})
	}

	// Help
	template.push({
		role: 'help',
		submenu: [
			{
				label: 'Open Documentation',
				click() {
					interop.openDocumentation('Getting Started')
				}
			},
			{
				label: 'Open Changelog',
				id: 'window_openChangelog',
				click: actionPassthrough
			},
			{ type: 'separator' },
			{
				label: 'Tangent\'s Website',
				click() {
					shell.openExternal('http://tangentnotes.com')
				}
			},
			{
				label: 'Email Tangent\'s Team',
				click() {
					shell.openExternal(`mailto:contact@tangentnotes.com?subject=Tangent v${app.getVersion()}`)
				}
			},
			{ type: 'separator' },
			{
				label: 'Tangent on Discord',
				click() {
					shell.openExternal('https://discord.gg/6VpvhUnxFe')
				}
			},
			{
				label: 'Tangent on Mastodon',
				click() {
					shell.openExternal('https://indieapps.space/@tangentnotes')
				}
			},
			{ type: 'separator' },
			{
				label: 'Show Logs',
				click() {
					shell.showItemInFolder(app.getPath('logs'))
				}
			}
		]
	})

	const menu = Menu.buildFromTemplate(template)
	Menu.setApplicationMenu(menu)
}

export function disableRendererActions(menu?: Menu) {
	menu = menu || Menu.getApplicationMenu()
	if (menu === null) return

	for (let item of menu.items) {
		if (item.id && item.id.startsWith('window_')) {
			item.enabled = false
		}
		if (item.submenu) {
			disableRendererActions(item.submenu)
		}
	}
}

export function updateMenuItems(update: { [key: string]: { [key:string]: any } }) {
	const menu = Menu.getApplicationMenu()
	if (menu === null) return

	for (const key of Object.keys(update)) {
		const menuItem = menu.getMenuItemById(windowPrefix + key)
		if (!menuItem) continue

		const content = update[key]
		if (!content) {
			console.error('Sent an empty object for', key)
			continue
		}
		if (content.enabled !== undefined) {
			menuItem.enabled = content.enabled
		}
		if (content.checked !== undefined) {
			menuItem.checked = content.checked
		}
	}
} 
