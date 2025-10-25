import { BrowserWindow, Menu, MenuItem, shell, screen, ipcMain, MenuItemConstructorOptions } from 'electron'
import { checkForUpdates } from './updates'
import { isMac } from '../common/platform'
import { mode } from './environment'
import { initDocumentation } from './documentation'
import { getWindowHandle } from './workspaces'
import Logger from 'js-logger'
import { ContextMenuTemplate } from 'common/menus'

const log = Logger.get('menus')

/** Items marked with the window prefix are intended to be handled by the indicated command within the window. */
const windowPrefix = 'window_'

function actionPassthrough(item: MenuItem, browserWindow: BrowserWindow) {
	let id = item.id
	if (id && id.startsWith(windowPrefix)) {
		id = id.substring(windowPrefix.length)
	}
	browserWindow.webContents.send('onMenuAction', id)
}

export function disableRendererActions(menu?: Menu) {
	menu = menu || Menu.getApplicationMenu()
	if (menu === null) return

	for (let item of menu.items) {
		if (item.id && item.id.startsWith(windowPrefix)) {
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

ipcMain.on('menus.setMainMenu', (event, template) => {
	const windowHandle = getWindowHandle(event.sender)
	if (!windowHandle?.window?.isFocused) return

	if (!Array.isArray(template)) {
		log.error('Main menu template must be an array', template)
		return
	}

	function recursiveConverter(item) {
		if (typeof item.id === 'string') {
			if (!item.id.startsWith(windowPrefix)) {
				log.warn('Menu template items must use "window_" command id prefixes.', item)
			}
			item.click = actionPassthrough
		}
		else if (typeof item.link === 'string') {
			const link = item.link
			item.click = () => {
				shell.openExternal(link)
			}
			delete item.link
		}
		else if (Array.isArray(item.submenu)) {
			for (const sub of item.submenu) {
				recursiveConverter(sub)
			}
		}
		else if (item.type === 'separator') {
			// this is fine
		}
		else {
			log.error('Menu template items must have a valid "window_" command id or a `link`.', item)
		}
	}

	// Do initial processing
	for (const item of template) {
		recursiveConverter(item)
	}

	// Inject & tweak mac-specific menus
	if (isMac) {
		template.unshift({
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

		const doIndex = template.findIndex(i => i.label === 'Do')
		if (doIndex >= 0) {
			// Inject speech options
			template[doIndex].submenu.push({
				label: 'Speech',
				submenu: [
					{ role: 'startSpeaking' },
					{ role: 'stopSpeaking' }
				]
			})

			// Inject window menu
			template.splice(doIndex, 0, { role: 'windowMenu' })
		}

		const helpIndex = template.findIndex(i => i.label === 'Help')
		if (helpIndex >= 0) {
			if (isMac) {
				template[helpIndex].role = 'help'
			}
		}

		if (mode === 'development') {
			template.splice(helpIndex >= 0 ? helpIndex : template.length - 2, 0,
				{
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
				}
			)
		}
	}

	Menu.setApplicationMenu(Menu.buildFromTemplate(template))
})

ipcMain.on('menus.updateCommandState', (event, states) => {
	const windowHandle = getWindowHandle(event.sender)
	if (windowHandle?.window?.isFocused) {
		updateMenuItems(states)
	}
})


ipcMain.on('postMenuUpdate', (event, state) => {
	const windowHandle = getWindowHandle(event.sender)
	if (windowHandle && windowHandle.window?.isFocused) {
		updateMenuItems(state)
	}
})

ipcMain.on('showContextMenu', (event, template: ContextMenuTemplate) => {
	function actionPassthrough(item: MenuItem, browserWindow: BrowserWindow) {
		// TODO: Maybe I need items here?
		// Fallback to default menu item forwarding
		event.sender.send('onMenuAction', item.id)
	}

	function recursivePassthrough(item: MenuItemConstructorOptions) {
		item.click = actionPassthrough
		if (Array.isArray(item.submenu)) {
			for (const sub of item.submenu) {
				recursivePassthrough(sub)
			}
		}
	}

	if (template.top) {
		for (const item of template.top) {
			recursivePassthrough(item)
		}
	}

	if (template.middle) {
		for (const item of template.middle) {
			recursivePassthrough(item)
		}
	}

	if (template.bottom) {
		for (const item of template.bottom) {
			recursivePassthrough(item)
		}
	}

	const windowHandle = getWindowHandle(event.sender)
	if (windowHandle) {
		windowHandle.contextMenuCustomizations = template	
	}
})

