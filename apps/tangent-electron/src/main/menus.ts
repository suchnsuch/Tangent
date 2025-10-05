import { app, BrowserWindow, Menu, MenuItem, shell, WebContents, screen } from 'electron'
import type { MenuItemConstructorOptions } from 'electron/main'
import { checkForUpdates } from './updates'
import type WindowHandle from './WindowHandle'
import { isMac } from '../common/platform'
import { mode } from './environment'
import { initDocumentation } from './documentation'

/** Items marked with the window prefix are intended to be handled by the indicated command within the window. */
const windowPrefix = 'window_'

function actionPassthrough(item: MenuItem, browserWindow: BrowserWindow) {
	let id = item.id
	if (id && id.startsWith(windowPrefix)) {
		id = id.substring(windowPrefix.length)
	}
	browserWindow.webContents.send('onMenuAction', id)
}

type MenuInterop = {
	createWindow: () => void
	getWindowHandle: (windowReference: BrowserWindow | WebContents) => WindowHandle
	openDocumentation: (name: string) => void
	keymap?: { [key: string]: string }
}

function processTemplate(
	template: Electron.MenuItemConstructorOptions | Electron.MenuItemConstructorOptions[],
	keymap?: { [key: string]: string }
) {
	if (Array.isArray(template)) {
		for (const item of template) {
			processTemplate(item, keymap)
		}
	}
	else if (Array.isArray(template.submenu)) {
		processTemplate(template.submenu, keymap)
	}
	else if (template.id?.startsWith(windowPrefix)) {
		if (!template.click) {
			template.click = actionPassthrough
		}
		if (keymap) {
			const id = template.id.substring(windowPrefix.length)
			const accelerator = keymap[id]
			if (accelerator) {
				template.accelerator = accelerator
				template.registerAccelerator = false
			}
		}
	}
}

export function createMenus(interop: MenuInterop) {

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
					label: 'Preferences'
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
				label: 'New Note'
			},
			{
				id: 'window_createNewNoteFromRule',
				label: 'New Note from Rule'
			},
			{
				id: 'window_saveCurrentFile',
				label: 'Save'
			},
			{
				id: 'window_duplicateNode',
				label: 'Duplicate'
			},
			{ type: 'separator' },
			{
				id: 'window_closeCurrentFile',
				label: 'Close Note'
			},
			{
				id: 'window_closeOtherFiles',
				label: 'Close Other Notes'
			},
			{
				id: 'window_closeLeftFiles',
				label: 'Close Notes to the Left'
			},
			{
				id: 'window_closeRightFiles',
				label: 'Close Notes to the Right',
				click: actionPassthrough
			},
			{ type: 'separator' },
			{
				id: 'window_openWorkspace',
				label: 'Open Workspace',
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
			role: 'pasteAndMatchStyle',
			// Normalize the shortcut across mac/win/linux
			accelerator: 'CommandOrControl+Shift+V'
		},
		{ role: 'selectAll' },
		{ type: 'separator' },
		{
			label: 'Formatting',
			submenu: [
				{
					id: 'window_toggleBold',
					label: 'Toggle Bold'
				},
				{
					id: 'window_toggleItalics',
					label: 'Toggle Italics'
				},
				{
					id: 'window_toggleHighlight',
					label: 'Toggle Highlight'
				},
				{
					id: 'window_toggleInlineCode',
					label: 'Toggle Inline Code'
				},
				{ type: 'separator' },
				{
					id: 'window_setParagraph',
					label: 'Paragraph'
				},
				{
					id: 'window_setHeader1',
					label: 'Header 1'
				},
				{
					id: 'window_setHeader2',
					label: 'Header 2'
				},
				{
					id: 'window_setHeader3',
					label: 'Header 3'
				},
				{
					id: 'window_setHeader4',
					label: 'Header 4'
				},
				{
					id: 'window_setHeader5',
					label: 'Header 5'
				},
				{
					id: 'window_setHeader6',
					label: 'Header 6'
				}
			]
		},
		{
			label: 'Links',
			submenu: [
				{
					id: 'window_toggleWikiLink',
					label: 'Toggle Wiki Link'
				},
				{
					id: 'window_toggleMDLink',
					label: 'Toggle External Link'
				}
			]
		}
	]

	if (!isMac) {
		editMenu.push({
			id: 'window_openPreferences',
			label: 'Preferences'
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
				type: 'checkbox'
			},

			{
				id: 'window_setThreadFocusLevel',
				label: 'Thread View',
				type: 'checkbox'
			},

			{
				id: 'window_toggleFocusMode',
				label: 'Toggle Focus Mode'
			},
			{
				id: 'window_setFileFocusLevel',
				label: '    File',
				type: 'checkbox'
			},
			{
				id: 'window_setTypewriterFocusLevel',
				label: '    Typewriter',
				type: 'checkbox'
			},
			{
				id: 'window_setParagraphFocusLevel',
				label: '    Paragraph',
				type: 'checkbox'
			},
			{
				id: 'window_setLineFocusLevel',
				label: '    Line',
				type: 'checkbox'
			},
			{
				id: 'window_setSentenceFocusLevel',
				label: '    Sentence',
				type: 'checkbox'
			},
			{
				id: 'window_showIncomingLinks',
				label: 'Show Incoming Links'
			},

			{ type: 'separator' },

			{
				id: 'window_toggleLeftSidebar',
				label: 'Show Left Sidebar',
				type: 'checkbox'
			},

			{ type: 'separator' },

			{
				id: 'window_zoomIn',
				label: 'Zoom In'
			},
			{
				id: 'window_zoomOut',
				label: 'Zoom Out'
			},
			{
				id: 'window_resetZoom',
				label: 'Reset Zoom'
			},
			
			{ type: 'separator' },

			{
				id: 'window_floatWindow',
				label: 'Float Window',
				type: 'checkbox'
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
				label: 'Go Back'
			},
			{
				id: 'window_shiftHistoryForward',
				label: 'Go Forward'
			},
			{ type: 'separator' },
			{
				id: 'window_goTo',
				label: 'Go To File...'
			},
			{
				id: 'window_openQueryPane',
				label: 'New Search Query'
			},
			{
				id: 'window_showInFileBrowser',
				label: isMac ? 'Show in Finder' : 'Show in Explorer'
			},
			{
				id: 'window_moveToLeftFile',
				label: 'Move to Left Note'
			},
			{
				id: 'window_moveToRightFile',
				label: 'Move to Right Note'
			}
		]
	})

	// Do
	const doMenu: MenuItemConstructorOptions[] = [
		{
			id: 'window_do',
			label: 'Show Command Palette'
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
				},
				{
					label: 'Force Reload',
					accelerator: 'CommandOrControl+R',
					async click(menuItem, window: BrowserWindow, event) {
						await window.webContents.session.clearCache()
						await window.webContents.session.clearStorageData({
							storages: ['filesystem', 'cachestorage'],
							quotas: ['temporary']
						});
						window.reload()
					},
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
				id: 'window_openChangelog'
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

	processTemplate(template, interop.keymap)

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
