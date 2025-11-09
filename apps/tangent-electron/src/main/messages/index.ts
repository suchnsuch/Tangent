import path from 'path'
import fs from 'fs'
import { load } from 'cheerio'
import { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, shell } from 'electron'
import { getDocumentationPath } from 'main/documentation'
import { getWindowHandle, getWorkspace, validateWorkspaceForHandleFilepath, hasShutdownWorkspaces, workspaceMap } from 'main/workspaces'

import fetch from 'node-fetch'
import type { SelectPathOptions } from 'common/WindowApi'

import fontList from 'font-list'

import Logger from 'js-logger'
import { fillDateFormat } from 'common/dates'

import './queries'
import './dictionary'
import './themes'
import './urlData'
import { FileSaveResult } from 'main/File'

const log = Logger.get('messages')

ipcMain.handle('getKnownWorkspaces', async (event) => {

	// A little debug option for convenience
	if (process.env.FORGET_WORKSPACES) {
		return []
	}

	const result: string[] = []
	const docPath = getDocumentationPath()
	for (const key of workspaceMap.keys()) {
		if (key === docPath) {
			// The documentation should not be considered a user workspace
			continue
		}
		result.push(key)
	}
	return result
})

ipcMain.handle('getWorkspace', async (event, workspacePath) => {
	let windowHandle = getWindowHandle(event.sender)
	if (windowHandle) {
		workspacePath = workspacePath || windowHandle.assignedWorkspacePath

		if (workspacePath) {
			let workspace = await getWorkspace(workspacePath)
			if (workspace) {
				// TODO: Load/observe workspace settings file
				return windowHandle.assignWorkspace(workspace)
			}
		}
	}
	return null
})

ipcMain.handle('getWorkspaceDialog', async (event) => {
	let windowHandle = getWindowHandle(event.sender)
	if (windowHandle) {
		let result = await dialog.showOpenDialog(windowHandle.window, {
			buttonLabel: 'Select Workspace',
			defaultPath: app.getPath('documents'),
			title: 'Select a Workspace Folder',
			message: 'Select a folder that will act as your Tangent Workspace.',
			properties: ['openDirectory', 'createDirectory']
		})

		if (!result.canceled && result.filePaths.length === 1) {
			return result.filePaths[0]
		}
	}
	return null
})

ipcMain.on('forgetWorkspace', async (event, path) => {
	const browserWindow = BrowserWindow.fromWebContents(event.sender)

	const workspace = workspaceMap.get(path)
	if (workspace && workspace.observers.length) {
		dialog.showMessageBoxSync(browserWindow, {
			type: 'info',
			title: 'Cannot Forget',
			message: 'This workspace cannot be forgotten as it is currently in use.\nClose any windows using this workspace to forget it.'
		})
	}
	else {
		const result = dialog.showMessageBoxSync(browserWindow, {
			type: 'question',
			title: 'Really Forget?',
			message: 'Are you sure you want to forget this workspace?\nThe contents of the workspace will not be deleted.',
			buttons: ['Forget', 'Cancel']
		})
	
		if (result === 0) {
			if (workspace) {
				await workspace.close()
			}
			workspaceMap.delete(path)
		}
	}
})

ipcMain.on('receiveWorkspaceStatePatch', (event, patch) => {
	let windowHandle = getWindowHandle(event.sender)
	if (windowHandle && windowHandle.workspace) {
		windowHandle.workspace.state.applyPatch(patch)
	}
})

ipcMain.on('receiveWorkspaceViewPatch', (event, patch) => {
	let windowHandle = getWindowHandle(event.sender)
	if (windowHandle && windowHandle.assignedWorkspacePath) {
		windowHandle.viewState.applyPatch(patch)
	}
})

ipcMain.on('receiveWorkspaceViewState', (event, state) => {
	let windowHandle = getWindowHandle(event.sender)
	if (windowHandle && windowHandle.assignedWorkspacePath) {
		windowHandle.setViewState(state)
	}
})

ipcMain.handle('window', (event, message, param) => {
	const browserWindow = BrowserWindow.fromWebContents(event.sender)
	if (browserWindow) {
		switch (message) {
			case 'close':
				browserWindow.close()
				break
			case 'toggleMaximize':
				if (browserWindow.isMaximizable()) {
					if (browserWindow.isMaximized()) {
						browserWindow.unmaximize()
					}
					else {
						browserWindow.maximize()
					}
				}
				break
			case 'minimize':
				if (browserWindow.minimizable) {
					browserWindow.minimize()
				}
				break
			case 'isAlwaysOnTop':
				return browserWindow.isAlwaysOnTop();
			case 'setAlwaysOnTop':
				browserWindow.setAlwaysOnTop(param)
				break
			case 'setSize':
				const { width, height } = param
				if (typeof width === 'number' && typeof height === 'number') {
					browserWindow.setSize(width, height)
				}
				break
		}
	}
})

/**
 * File Handling messages
 */
ipcMain.handle('createFile', async (event, filepath, meta) => {
	const windowHandle = getWindowHandle(event.sender)
	const workspace = validateWorkspaceForHandleFilepath(windowHandle, filepath)

	if (workspace) {
		try {
			workspace.createFile(windowHandle, filepath, meta)
		}
		catch (err) {
			log.error('Failed to create file', err, {
				filepath, meta
			})
			const filename = workspace.contentsStore.pathToRelativePath(filepath) || filepath
			windowHandle.postUserMessage('error', 'Failed to Create File', `The file "${filename}" failed to be created successfully.\nSave your work elsewhere and restart Tangent.`)
		}
	}
	else {
		log.error('A window requested the creation of a file outside an open workspace', {
			filepath
		})
		windowHandle.postUserMessage('error', 'A file was attempted to be created outside of the workspace and was not created. ' + filepath)
	}
})

ipcMain.handle('createFolder', async (event, filepath) => {
	const windowHandle = getWindowHandle(event.sender)
	const workspace = validateWorkspaceForHandleFilepath(windowHandle, filepath)

	if (workspace) {
		try {
			await workspace.ensureFolderExists(windowHandle, filepath)
		}
		catch (err) {
			log.error('Failed to create folder', err, {
				filepath
			})
			const filename = workspace.contentsStore.pathToRelativePath(filepath) || filepath
			windowHandle.postUserMessage('error', 'Failed to Create Folder', `The folder "${filename}" failed to be created successfully.\nSave your work elsewhere and restart Tangent.`)
		}
	}
	else {
		log.error('A window requested the creation of a folder outside an open workspace', {
			filepath
		})
		windowHandle.postUserMessage('error', 'A folder was attempted to be created outside of the workspace and was not created. ' + filepath)
	}
})

ipcMain.handle('selectPath', async (event, options: SelectPathOptions) => {
	const windowHandle = getWindowHandle(event.sender)
	const workspace = windowHandle?.workspace
	if (!workspace) return

	const mode = options?.mode ?? 'path'

	let eOptions: Electron.OpenDialogOptions = {
		defaultPath: options?.initialPath ?? workspace.rootPath,
		message: options?.message ?? ('Select a ' + mode + '.'),
	}

	let buttonLabel = ''
	switch (mode) {
		case 'file':
			buttonLabel = 'Select File'
			eOptions.properties = ['createDirectory', 'openFile']
			break
		case 'folder':
			buttonLabel = 'Select Folder'
			eOptions.properties = ['createDirectory', 'openDirectory']
			break
		case 'path':
			buttonLabel = 'Select Path'
			eOptions.properties = ['createDirectory', 'openFile', 'openDirectory']
			break
	}

	eOptions.title = options?.title ?? buttonLabel
	eOptions.buttonLabel = buttonLabel

	async function selectPath() {
		let result = await dialog.showOpenDialog(windowHandle.window, eOptions)
	
		if (result && !result.canceled && result.filePaths.length > 0) {
			if (!options?.allowExternal && result.filePaths.find(f => !workspace.containsPath(f))) {
				const errorResult = await dialog.showMessageBox(
					windowHandle.window,
					{
						title: 'Must Be Workspace Folder',
						message: 'The selected folder must be within the workspace.',
						type: 'warning',
						buttons: ['Cancel', 'Select Folder']
					})
				if (errorResult.response === 1) {
					// Let the user select the folder again
					return await selectPath()
				}
			}
			else {
				// Workspace folders should always be relative
				const list = result.filePaths.map(f => workspace.contentsStore.pathToRelativePath(f))
				if (options?.selectMultiple) {
					return list
				}
				return list[0]
			}
		}
	}

	return await selectPath()
})

ipcMain.handle('messageDialog', (event, args) => {
	const windowHandle = getWindowHandle(event.sender)
	return dialog.showMessageBox(windowHandle.window, args)
})

ipcMain.handle('move', async (event, filepath, newPath) => {
	const windowHandle = getWindowHandle(event.sender)
	const workspace = validateWorkspaceForHandleFilepath(windowHandle, filepath)
	const otherSpace = validateWorkspaceForHandleFilepath(windowHandle, newPath)

	if (workspace && otherSpace) {
		try {
			await workspace.move(filepath, newPath)
		}
		catch (err) {
			log.error(`Failed to move ${filepath} to ${newPath}.`, err)
			const filename = workspace.contentsStore.pathToRelativePath(filepath) || filepath
			windowHandle.postUserMessage('error', `An error occured while moving ${filename}.\nPlease save your work elsewhere and restart Tangent.`)
		}
	}
	else {
		log.error('A window tried to move a file outside of an open workspace', {
			filepath
		})
		windowHandle.postUserMessage('error', 'A file was attempted to be renamed outside of the workspace and was not renamed. ' + filepath)
	}
})

ipcMain.handle('copy', async (event, filepath, newPath) => {
	const windowHandle = getWindowHandle(event.sender)
	const workspace = validateWorkspaceForHandleFilepath(windowHandle, filepath)
	const otherSpace = validateWorkspaceForHandleFilepath(windowHandle, newPath)

	if (workspace && otherSpace) {
		try {
			await workspace.copy(filepath, newPath)
		}
		catch (err) {
			log.error(`Failed to copy ${filepath} to ${newPath}.`, err)
			const filename = workspace.contentsStore.pathToRelativePath(filepath) || filepath
			windowHandle.postUserMessage('error', `An error occured while copying ${filename}.\nPlease save your work elsewhere and restart Tangent.`)
		}
	}
	else {
		log.error('A window tried to copy a file outside of an open workspace', {
			filepath
		})
		windowHandle.postUserMessage('error', 'A file was attempted to be renamed outside of the workspace and was not renamed. ' + filepath)
	}
})

ipcMain.handle('delete', async (event, filepath) => {
	const windowHandle = getWindowHandle(event.sender)
	const workspace = validateWorkspaceForHandleFilepath(windowHandle, filepath)

	if (workspace) {
		try {
			await workspace.delete(filepath)
		}
		catch (err) {
			log.error('Failed to delete', filepath, err)
			const filename = workspace.contentsStore.pathToRelativePath(filepath) || filepath
			windowHandle.postUserMessage('error', `Tangent failed to delete ${filename}. See logs for more details.`)
		}
	}
	else {
		log.error('A window tried to delete a file outside of an open workspace', {
			filepath
		})
		windowHandle.postUserMessage('error', 'A file was attempted to be deleted outside of the workspace and was not deleted. ' + filepath)
	}
})

ipcMain.on('openFile', (event, filepath) => {
	const windowHandle = getWindowHandle(event.sender)
	const workspace = validateWorkspaceForHandleFilepath(windowHandle, filepath)

	if (windowHandle && workspace) {
		log.trace('opening file', filepath)
		try {
			// This will auto-load and send the file contents
			workspace.openFile(windowHandle, filepath)
		}
		catch (err) {
			log.error('Failed to open file', filepath, err)
			const filename = workspace.contentsStore.pathToRelativePath(filepath) || filepath
			windowHandle.postUserMessage('error', `Tangent failed to open ${filename}. See logs for more details.`)
		}
	}
	else {
		// If we get here, that's bad
		log.error('A window requested a file outside of an open workspace', {
			filepath
		})
	}
})

ipcMain.on('closeFile', (event, filepath) => {
	// When the app is closing, these don't matter
	if (hasShutdownWorkspaces()) return
	
	const windowHandle = getWindowHandle(event.sender)

	// For close messages, this is fine; the handle is closing
	if (!windowHandle?.workspace) return

	const workspace = validateWorkspaceForHandleFilepath(windowHandle, filepath)
	
	if (windowHandle && workspace) {
		try {
			workspace.dropFile(windowHandle, filepath)
		}
		catch (err) {
			log.error('Failed to close file', filepath, err)
			const filename = workspace.contentsStore.pathToRelativePath(filepath) || filepath
			windowHandle.postUserMessage('error', `Tangent failed to close ${filename}. See logs for more details.`)
		}
	}
	else {
		log.error('A window tried to close a file outside of an open workspace', {
			filepath
		})
	}
})

ipcMain.on('updateFile', (event, filepath, content) => {
	const windowHandle = getWindowHandle(event.sender)
	const workspace = validateWorkspaceForHandleFilepath(windowHandle, filepath)
	
	if (workspace) {
		workspace.updateFileContents(filepath, content, windowHandle).then(success => {
			if (success === FileSaveResult.Failed) {
				windowHandle.postUserMessage(
					'error',
					'File Write Error',
					`Could not write "${filepath}" to disk.
Please copy your note elsewhere to avoid data loss and restart Tangent.
Consider reaching out to the developer for support.
Appologies for the inconvenience.`)
			}
		})
	}
	else {
		// If we get here, that's bad
		log.error('A window tried to save a file outside of an open workspace', {
			filepath
		})
		windowHandle?.postUserMessage('error', 'A file was attempted to be updated outside of the workspace and was not updated. ' + filepath)
	}
})

ipcMain.on('updateMetadata', (event, files) => {
	let windowHandle = getWindowHandle(event.sender)
	if (windowHandle && windowHandle.workspace) {
		windowHandle.workspace.updateMetadata(files, windowHandle)
	}
})

ipcMain.on('showInFileBrowser', (event, path) => {
	try {
		switch (path) {
			case 'logs':
				path = app.getPath(path)
				break
		}
		shell.showItemInFolder(path)
	}
	catch(e) {
		log.error('Could not open', path)
		log.error(e)
	}
})

ipcMain.handle('openPath', async (event, path) => {
	try {
		log.info('Opening path ' + path)
		const result = await shell.openPath(path)

		if (!result) return

		const windowHandle = getWindowHandle(event.sender)
		const message = `Could not open ${path}: ${result}`
		log.warn(message)
		if (windowHandle && windowHandle.workspace) {
			windowHandle.postUserMessage(
				'warning',
				result,
				message
			)
		}
	}
	catch(e) {
		log.error('Could not open', path, e)
	}
})

ipcMain.handle('openExternal', async (event, path) => {
	try {
		await shell.openExternal(path)
	}
	catch (e) {
		log.error('Could not open', path)
		log.error(e)

		const windowHandle = getWindowHandle(event.sender)
		const title = (e instanceof Error) ? e.message : 'Link Error!'
		if (windowHandle && windowHandle.workspace) {
			windowHandle.postUserMessage(
				'warning',
				title,
				'Could not open ' + path
			)
		}
	}
})

ipcMain.on('edit-native', (event, action) => {
	const windowHandle = getWindowHandle(event.sender)
	if (windowHandle) {
		console.log('executing', action)
		windowHandle.window.webContents[action]()
	}
})

ipcMain.handle('getAllFonts', async (event) => {
	try {
		const fonts = await fontList.getFonts({ disableQuoting: true })
		return fonts
	}
	catch (e) {
		log.error('Font list could not be procured.', e)
	}
})

ipcMain.handle('getAllLanguages', async (event) => {
	const windowHandle = getWindowHandle(event.sender)
	if (windowHandle) {
		return windowHandle.window.webContents.session.availableSpellCheckerLanguages
	}
})

ipcMain.handle('saveImageFromClipboard', (event, contextPath) => {
	try {
		const nativeImage = clipboard.readImage()
		const image = nativeImage.toPNG()

		// This chunk of code heralds from https://stackoverflow.com/questions/31468395/image-dpi-in-javascript-nodejs-and-electron
		// It was an attempt to read the 'pHYs' chunk of the clipboard png file
		// This block does _not_ appear to exist.
		// Leaving this here to remind me that I want to solve this.
		// function* parseChunks(data) {
		// 	var offset = 8; // skip PNG header
		  
		// 	while (offset < data.length) {
		// 		var dataLength  = data.readUInt32BE(offset);
		// 		var chunkLength = dataLength + 12;
		// 		var typeStart   = offset + 4;
		// 		var dataStart   = offset + 8;
		// 		var dataEnd     = offset + 8 + dataLength;
		// 		var crcEnd      = dataEnd + 4;
		  
		// 		yield {
		// 			type : data.toString('ascii', typeStart, dataStart),
		// 			data : data.slice(dataStart, dataEnd),
		// 			crc  : data.slice(dataEnd, crcEnd),
		// 		};
		  
		// 	  offset = crcEnd;
		// 	}
		// }
		  
		// for (let chunk of parseChunks(image)) {
		// 	// Extract pixel information
		// 	console.log(chunk.type)
		// 	if (chunk.type === 'pHYs') {
		// 		var ppuX = chunk.data.readUInt32BE(0);
		// 		var ppuY = chunk.data.readUInt32BE(4);
		// 		var unit = chunk.data.readUInt8(8); // should always be `1`
		// 		var more = chunk.data.readUInt32BE(8);
		// 		console.log({
		// 			buffer: chunk.data,
		// 			ppuX,
		// 			ppuY,
		// 			unit,
		// 			more,
		// 			'PPI': Math.round(ppuX * 0.0254)
		// 		});
		// 	}
		// }
		const windowHandle = getWindowHandle(event.sender)
		const workspace = validateWorkspaceForHandleFilepath(windowHandle, contextPath)

		const filename = fillDateFormat('Pasted on %YYYY%-%MM%-%DD% at %HH%.%mm%.%ss%.png', new Date())
		const attachmentPath = workspace.getAttachmentPath(filename, contextPath)
		const directory = path.dirname(attachmentPath)
		fs.promises.mkdir(directory, { recursive: true }).then(() => {
			return fs.promises.writeFile(attachmentPath, image)
		}).catch(error => {
			log.error('Could not write image from clipboard', error)
		})
		
		return attachmentPath
	}
	catch (error) {
		log.error('Could not pull image from clipboard', error)
	}
})

ipcMain.handle('copyImageToClipboard', async (event, path: string) => {
	const image = nativeImage.createFromPath(path)
	if (!image.isEmpty()) {
		clipboard.writeImage(image)
	}
})

ipcMain.handle('getLinkTitle', async (event, href: string) => {
	try {
		const response = await fetch(href)
		if (response.status === 200) {
			const body = await response.text()
			const $ = load(body)
			return $('title').text()
		}
	}
	catch (e) {
		log.warn('Could not connect to ', href)
		log.warn(e)
	}
	return ''
})

ipcMain.handle('saveFromUrl', async (event, href: string, contextPath: string) => {
	try {
		const response = await fetch(href)
		if (response.status === 200) {
			const contentType = response.headers.get('content-type') as string
			const contentDisposition = response.headers.get('content-disposition') as string
			const predisposedFilename = contentDisposition?.match(/filename="(.*)"/)[1]

			const imageMatch = contentType.match(/image\/(\w+)/)
			if (imageMatch) {

				const filename = predisposedFilename ?? fillDateFormat(`Downloaded on %YYYY%-%MM%-%DD% at %HH%.%mm%.%ss%.${imageMatch[1]}`, new Date())
				
				const windowHandle = getWindowHandle(event.sender)
				const workspace = validateWorkspaceForHandleFilepath(windowHandle, contextPath)

				const attachmentPath = workspace.getAttachmentPath(filename, contextPath)
				const directory = path.dirname(attachmentPath)

				await fs.promises.mkdir(directory, { recursive: true }).then(() => {
					return fs.promises.writeFile(attachmentPath, response.body)
				}).catch(error => {
					log.error('Could not write image from url', error)
				})

				return attachmentPath
			}
		}
	}
	catch (error) {
		log.warn('Could not connect to ', href)
		log.warn(error)
	} 
})
