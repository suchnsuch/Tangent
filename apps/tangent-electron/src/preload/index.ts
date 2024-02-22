import type WindowApi from 'common/WindowApi'
import { contextBridge, ipcRenderer } from 'electron'

function on(channel:string,  handler: (...args) => void) {
	ipcRenderer.on(channel, (event, ...args) => {
		try {
			handler(...args)
		}
		catch (err) {
			console.error('Error parsing data', channel, args)
			console.error(err)
		}
	})
}

let bridge: WindowApi = {

	getKnownWorkspaces() {
		return ipcRenderer.invoke('getKnownWorkspaces')
	},

	getWorkspace(workspacePath) {
		return ipcRenderer.invoke('getWorkspace', workspacePath)
	},

	forgetWorkspace(workspacePath) {
		return ipcRenderer.send('forgetWorkspace', workspacePath)
	},

	getWorkspaceDialog() {
		return ipcRenderer.invoke('getWorkspaceDialog')
	},

	sendWorkspaceStatePatch(patch) {
		// Invert the namming so that the message makes sense on the main side
		ipcRenderer.send('receiveWorkspaceStatePatch', patch)
	},

	onWorkspaceStatePatch(handler) {
		// Invert the namming so that the message makes sense on the main side
		on('sendWorkspaceStatePatch', handler)
	},

	sendWorkspaceViewPatch(patch) {
		// Invert the namming so that the message makes sense on the main side
		ipcRenderer.send('receiveWorkspaceViewPatch', patch)
	},

	onWorkspaceViewPatch(handler) {
		// Invert the namming so that the message makes sense on the main side
		on('sendWorkspaceViewPatch', handler)
	},

	setWorkspaceViewState(state) {
		// Invert the namming so that the message makes sense on the main side
		ipcRenderer.send('receiveWorkspaceViewState', state)
	},

	onMenuAction(handler) {
		on('onMenuAction', handler)
	},

	onGetAllMenus(handler) {
		on('getAllMenus', handler)
	},

	postMenuUpdate(content) {
		ipcRenderer.send('postMenuUpdate', content)
	},

	showContextMenu(template) {
		ipcRenderer.send('showContextMenu', template)
	},

	onWorkspaceAction(handler) {
		on('workspaceAction', handler)
	},

	onMessage(handler) {
		on('message', handler)
	},

	window: {
		close() {
			ipcRenderer.invoke('window', 'close')
		},
		minimize() {
			ipcRenderer.invoke('window', 'minimize')
		},
		toggleMaximize() {
			ipcRenderer.invoke('window', 'toggleMaximize')
		},
		create() {
			ipcRenderer.invoke('createWindow')
		},
		isAlwaysOnTop() {
			return ipcRenderer.invoke('window', 'isAlwaysOnTop')
		},
		setAlwaysOnTop(value) {
			ipcRenderer.invoke('window', 'setAlwaysOnTop', value)
		},
		setSize(size) {
			return ipcRenderer.invoke('window', 'setSize', size)
		}
	},
	system: {
		getAllFonts() {
			return ipcRenderer.invoke('getAllFonts')
		},
		getAllLanguages() {
			return ipcRenderer.invoke('getAllLanguages')
		},
		saveImageFromClipboard(contextPath) {
			return ipcRenderer.invoke('saveImageFromClipboard', contextPath)
		},
		messageDialog(options) {
			return ipcRenderer.invoke('messageDialog', options)
		}
	},
	file: {
		onTreeChange(handler) {
			on('treeChange', handler)
		},
		createFile(filepath, meta) {
			return ipcRenderer.invoke('createFile', filepath, meta)
		},
		createFolder(filepath) {
			return ipcRenderer.invoke('createFolder', filepath)
		},
		move(filepath, newPath) {
			return ipcRenderer.invoke('move', filepath, newPath)
		},
		copy(filepath, newPath) {
			return ipcRenderer.invoke('copy', filepath, newPath)
		},
		delete(filepath) {
			return ipcRenderer.invoke('delete', filepath)
		},
		openFile(filepath) {
			ipcRenderer.send('openFile', filepath)
		},
		onReceiveFileContents(handler) {
			on('receiveFileContents', handler)
		},
		closeFile(filepath) {
			ipcRenderer.send('closeFile', filepath)
		},
		updateFile(filepath, content) {
			ipcRenderer.send('updateFile', filepath, content)
		},
		showInFileBrowser(path) {
			ipcRenderer.send('showInFileBrowser', path)
		},
		selectPath(options) {
			return ipcRenderer.invoke('selectPath', options)
		},
		openPath(path) {
			ipcRenderer.invoke('openPath', path)
		},
	},
	edit: {
		nativeAction(action) {
			ipcRenderer.send('edit-native', action)
		},
		onPastePlaintext(handler) {
			on('pastePlaintext', handler)
		}
	},
	links: {
		openExternal(path) {
			ipcRenderer.invoke('openExternal', path)
		},
		getTitle(href) {
			return ipcRenderer.invoke('getLinkTitle', href)
		},
		saveFromUrl(href, contextPath) {
			return ipcRenderer.invoke('saveFromUrl', href, contextPath)
		}
	},
	query: {
		resultsForQuery(queryString) {
			return ipcRenderer.invoke('query', 'results', queryString)
		},
		parseQuery(queryString) {
			return ipcRenderer.invoke('query', 'parse', queryString)
		}
	},
	settings: {
		patch(patch: any) {
			ipcRenderer.send('patchGlobalSettings', patch)
		}
	},
	documentation: {
		open(name) {
			ipcRenderer.invoke('documentation', 'open', name)
		},
		get(name) {
			return ipcRenderer.invoke('documentation', 'get', name)
		},
		getChangelogs() {
			return ipcRenderer.invoke('documentation', 'getChangelogs')
		},
		getRecentChanges() {
			return ipcRenderer.invoke('documentation', 'getRecentChanges')
		}
	},
	update: {
		onChecking(handler) {
			on('checking-for-update', handler)
		},
		onAvailable(handler) {
			on('update-available', handler)
		},
		onNotAvailable(handler) {
			on('update-not-available', handler)
		},
		onProgress(handler) {
			on('update-progress', handler)
		},
		onReady(handler) {
			on('update-ready', handler)
		},
		onError(handler) {
			on('update-error', handler)
		},
		checkForUpdate() {
			ipcRenderer.send('update', 'check')
		},
		update() {
			ipcRenderer.send('update', 'now')
		}
	}
}

contextBridge.exposeInMainWorld('api', bridge)
