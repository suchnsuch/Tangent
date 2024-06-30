import { app, BrowserWindow } from 'electron'
import fs from 'fs'
import Logger from 'js-logger'
import path from 'path'

import { getWorkspaceNamePrefix } from './environment'
import type WindowHandle from "./WindowHandle"
import Workspace from "./Workspace"

const log = Logger.get('workspaces')

export const workspacesInfoPath = path.join(
	app.getPath('userData'),
	getWorkspaceNamePrefix() + 'workspaces.json')

const defaultSettingsPath = path.resolve(path.join(__dirname, '../../defaults'))

/**
 * Abusing the map and js nullishness:
 * - `null` means the workspace is known but not loaded
 * - `undefined` means there is no known workspace (not in map)
 */
export const workspaceMap: Map<string, Workspace> = new Map()
export const workspaceLoadMap: Map<string, Promise<Workspace>> = new Map()

export async function getWorkspace(path: string): Promise<Workspace> {
	const workspace = workspaceMap.get(path)
	if (workspace) {
		return workspace
	}

	let waithandle = workspaceLoadMap.get(path)
	if (waithandle) {
		return waithandle
	}

	waithandle = Workspace.loadWorkspace(path, defaultSettingsPath)
	workspaceLoadMap.set(path, waithandle)

	waithandle.then(workspace => {
		workspaceMap.set(path, workspace)
		workspaceLoadMap.delete(path)
	})

	return waithandle
}

export function validateWorkspaceForHandleFilepath(handle: WindowHandle, filepath: string) {
	if (!handle?.workspace) {
		log.error('Cannot use a handle without a workspace to access a file!', filepath)
		return null
	}

	if (handle.workspace.containsPath(filepath)) {
		return handle.workspace
	}
	return null
}

export const contentsMap: Map<Electron.WebContents, WindowHandle> = new Map()
export function getWindowHandle(key: BrowserWindow | Electron.WebContents): WindowHandle {
	if (key instanceof BrowserWindow) {
		return contentsMap.get(key.webContents)
	}
	return contentsMap.get(key)
}

export async function dropWorkspace(workspace: Workspace, handle: WindowHandle) {
	if (handle) {
		workspace.removeObserver(handle)
	}

	if (workspace.observers.length === 0) {
		await workspace.close()
		// Do not delete, otherwise the workspace will be forgotten
		workspaceMap.set(workspace.rootPath, null)
	}
}

let workspaceShutdownState: 'open' | 'closing' | 'finished' = 'open'
export async function saveAndCloseWorkspaces() {
	if (workspaceShutdownState !== 'open') return
	workspaceShutdownState = 'closing'
	
	// Save open workspace info
	const knownWorkspaces = []
	const openWorkspaces = []

	for (let pair of workspaceMap) {
		if (pair[0]) {
			knownWorkspaces.push(pair[0])
		}
	}

	for (let windowHandle of contentsMap.values()) {
		if (windowHandle.assignedWorkspacePath) {
			openWorkspaces.push(windowHandle.assignedWorkspacePath)
		}
	}

	let promises: Promise<any>[] = []

	const writeWorkspaceInfo = async () => {
		try {
			const workspaces = {
				knownWorkspaces,
				openWorkspaces
			}
	
			const payload = JSON.stringify(workspaces, null, '\t')
	
			log.log('Writing workspace info to: ', workspacesInfoPath, payload)
			await fs.promises.writeFile(workspacesInfoPath, payload)
		}
		catch (err) {
			log.error('Could not save workspace data')
			log.error(err)
		}
	}

	promises.push(writeWorkspaceInfo())

	for (let workspace of workspaceMap.values()) {
		if (workspace) {
			promises.push(workspace.close())
		}
	}

	await Promise.all(promises).catch(err => {
		log.error('Error closing workspaces')
		log.error(err)
	})

	workspaceShutdownState = 'finished'
}

export function hasShutdownWorkspaces() { return workspaceShutdownState === 'finished' }

/**
 * Finds the closest .tangent directory, or uses the given directory / parent directory (for files)
 * @param filepath The file or folder to start with
 */
export async function findClosestWorkspace(filepath: string) {
	try {
		const originInfo = await fs.promises.stat(filepath)
		let walkingDirectory = filepath
		if (originInfo.isFile()) {
			walkingDirectory = path.dirname(filepath)
		}

		while (walkingDirectory) {
			try {
				log.debug("Checking", walkingDirectory)
				const info = await fs.promises.stat(path.join(walkingDirectory, Workspace.TANGENT_DIRECTORY))
				// Success means it exists
				if (info.isDirectory()) {
					return walkingDirectory
				}
			}
			catch (err) {
				// Nothing there
			}

			// Go up one level
			const parent = path.dirname(walkingDirectory)
			if (parent === walkingDirectory) {
				break
			}
			walkingDirectory = parent
		}

		// Fallback
		if (originInfo.isFile()) {
			return path.dirname(filepath)
		}
		return filepath
	}
	catch (err) {
		log.warn(`Could not find workspace for "${filepath}"`, err)
		return null
	}
}
