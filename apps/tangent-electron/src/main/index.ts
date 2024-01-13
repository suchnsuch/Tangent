import {
	app,
	BrowserWindow
} from 'electron'

import dotenv from 'dotenv'
dotenv.config()

import sourceMapSupport from 'source-map-support'
sourceMapSupport.install()

import fs from 'fs'
import path from 'path'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { mode } from './environment'
import {
	getWorkspace,
	getWindowHandle,
	workspaceMap,
	workspacesInfoPath, 
	saveAndCloseWorkspaces,
	findClosestWorkspace,
	contentsMap
} from './workspaces'
import { createMenus } from './menus'

import Logger from 'js-logger'
import { setupLogging } from './logging'

import { loadSettings, saveSettings, getSettings} from './settings'
import { initDocumentation, openDocumentation, shouldShowChangelog } from './documentation'
import { createWindow, getOrCreateWindowForWorkspace } from './windows'

import './messages'
import { installTextmate } from '@such-n-such/tangent-query-parser'
import { getRegistry } from './grammarLoader'
import { INITIAL } from 'vscode-textmate'
import { initializeDebugging } from './debugging'

/******************
 * Initialization *
 ******************/
function initializeApplication() {
	// Set up Logging
	setupLogging()
	if (mode === 'production') {
		Logger.setLevel(Logger.INFO)
	}
	else {
		Logger.setLevel(Logger.DEBUG)
	}

	Logger.info(`

******************************************************
******************************************************
Tangent ${app.getVersion()} Launched With Arguments:`, process.argv)

	initializeDebugging()

	let appReady = false
	let openOverride = undefined

	function openPathInTangent(targetPath) {
		if (typeof targetPath !== 'string') return
		targetPath = path.resolve(targetPath)
		if (!appReady) {
			Logger.info('Defering opening until setup is complete', targetPath)
			openOverride = targetPath
			return
		}

		findClosestWorkspace(targetPath).then(workspacePath => {
			if (targetPath !== workspacePath) {
				Logger.info(`Opening "${targetPath}" in the context of "${workspacePath}"`)
			}
			else {
				Logger.info(`Opening "${targetPath}"`)
			}

			const window = getOrCreateWindowForWorkspace(workspacePath)
			if (targetPath !== workspacePath) {
				const handle = getWindowHandle(window)
				handle.whenReady().then(h => {
					h.navigateTo(targetPath)
				})
			}
		})
	}

	function processArgs(argv) {
		if (process.env.INTEGRATION_TEST) {
			argv = argv.slice(2)
		}
		else {
			argv = hideBin(argv).filter(v => {
				switch (v) {
					// Attempt to strip out chromium options
					case '--allow-file-access-from-files':
					case '--original-process-start-time':
						return false
					default:
						return true
				}
			})
		}

		Logger.log('processed args', argv)

		yargs(argv)
		.command(['open [path]', '*'],
			'Opens the specified file or workspace, or opens previously open workspaces if nothing is specified',
			args => {},
			args => openPathInTangent(args.path))
		.parse()
	}

	processArgs(process.argv)

	// This method will be called when Electron has finished
	// initialization and is ready to create browser windows.
	// Some APIs can only be used after this event occurs.
	app.on('ready', onReady);

	// This is a mac-only event that is called when a folder or file is dragged to the app
	app.on('open-file', (event, path) => {
		event.preventDefault()
		openPathInTangent(path)
	})

	app.on('second-instance', (event, args) => {
		Logger.log('Captured arguments sent to a second instance: ', args)
		processArgs(args)
	})

	async function onReady() {
		const log = Logger.get('initialization')
		log.info('Tangent Initializing...')
		let hasOpenedWindows = false
		
		try {
			await Promise.all([
				loadSettings(),
				initDocumentation(),
				installTextmate({ registry: getRegistry(), initialStack: INITIAL })
			])
		}
		catch (err) {
			log.error('CRITIAL INITIALIZATION ERROR. A major subcomponent of Tangent failed to initialize.')
			log.error(err)
		}
		
		try {
			log.info('  Loading workspace info from: ', workspacesInfoPath)

			let workspaces = null

			try {
				let data = await fs.promises.readFile(workspacesInfoPath, 'utf8')
				workspaces = JSON.parse(data)
				log.info('  Workspaces', workspaces)
			}
			catch {
				log.info('  No workspace info found')
				workspaces = {}
			}

			// Validate the known workspaces
			if (workspaces.knownWorkspaces) {
				let results: string[] = await Promise.all(workspaces.knownWorkspaces.map(async (workspacePath:string) => {
					try {
						let stats = await fs.promises.stat(workspacePath)
						if (stats && stats.isDirectory()) {
							return workspacePath
						}
					}
					catch (err) {
						// The workspace doesn't exist
						log.warn('  A workspace could not be found and will be dropped: ', workspacePath)
					}
					
					return null
				}))

				for (let workspacePath of results) {
					if (workspacePath) {
						workspaceMap.set(workspacePath, null)
					}
				}
			}

			appReady = true

			if (openOverride) {
				openPathInTangent(openOverride)
				hasOpenedWindows = true
			}
			else if (workspaces.openWorkspaces) {
				for (let workspacePath of workspaces.openWorkspaces) {
					if (workspaceMap.get(workspacePath) !== undefined) {
						// A null (or non null) value means this workspace was previously validated
						// Start the process of loading the workspace
						getWorkspace(workspacePath)

						// Create the window with the assigned workspace
						createWindow(workspacePath)
						hasOpenedWindows = true
					}
				}
			}
			
		}
		catch (err) {
			log.error('Could not load workspace data')
			log.error(err)
			// No existing workspace area
		}

		if (!hasOpenedWindows) {
			// No windows were opened, so let's open a new one
			createWindow()
		}

		shouldShowChangelog().then(async show => {
			if (show && getSettings().showChangelogOnUpdate.value) {
				await Promise.allSettled(BrowserWindow.getAllWindows().map(w => {
					return getWindowHandle(w)?.whenReady()
				}))
				
				const focusedWindow = getWindowHandle(BrowserWindow.getFocusedWindow())
				if (focusedWindow) {
					focusedWindow.invokeCommand('openChangelog')
				}
			}
		})
	}

	// Create the menus and pass along needed delegates
	createMenus({
		createWindow,
		getWindowHandle,
		openDocumentation
	})

	/**
	 * Application Event Handlers
	 */
	// Quit when all windows are closed, except on macOS. There, it's common
	// for applications and their menu bar to stay active until the user quits
	// explicitly with Cmd + Q.
	app.on('window-all-closed', () => {
		if (process.platform !== 'darwin') {
			app.quit();
		}
	});

	app.on('activate', () => {
		// On OS X it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});

	// The application will exit, but windows have not yet been closed
	app.on('before-quit', () => {
		saveSettings(true)
		saveAndCloseWorkspaces()
	})
}

let shouldInit = true

if (mode !== 'production') {
	require('electron-reload')(__dirname, {
		awaitWriteFinish: true
	})
}
else {
	const hasLock = app.requestSingleInstanceLock()
	if (!hasLock) {
		app.quit()
		shouldInit = false
	}
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
	app.quit()
	shouldInit = false
}

if (shouldInit) initializeApplication()

