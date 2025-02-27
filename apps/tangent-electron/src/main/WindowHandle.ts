import path from 'path'
import fs from 'fs'
import chalk from 'chalk'

import { app, BrowserWindow, clipboard, Menu, screen } from 'electron'
import type { WorkspaceInitState } from 'common/workspaceState'
import type { TreeChange } from 'common/trees'
import type Workspace from './Workspace'

import { ObjectStore } from 'common/stores'
import type { ProgressInfo, UpdateInfo } from 'electron-updater'
import { getSettings, subscribeToSettings } from './settings'
import Logger from 'js-logger'
import migrate, { latestViewStateVersion, migrateLegacyComputerNameWorkspaceViewState } from './migrations/viewStateMigrator'
import type { ContextMenuTemplate } from 'common/menus'
import type { FileContent } from './File'
import type { HrefForm, HrefFormedLink } from 'common/indexing/indexTypes'
import { getSafeComputerName, getSafeHostName, getWorkspaceNamePrefix } from './environment'
import type { UserMessage } from 'common/WindowApi'
import { dropWorkspace } from './workspaces'

// TODO: Make this not a copy paste
const mode = process.env.NODE_ENV || 'production';

const log = Logger.get('workspace-view')

type HandleReadyAction = (handle: WindowHandle) => void

/**
 * The main-side pair to common/WindowAPI
 */
export default class WindowHandle {

	window: BrowserWindow
	assignedWorkspacePath: string
	workspace: Workspace
	
	viewID: number
	viewState: ObjectStore
	_viewStateUnsub: () => void
	_settingsUnsub: () => void

	menuUpdateFunctions: ((menu: Menu) => void)[]

	contextMenuCustomizations?: ContextMenuTemplate

	private readyActions: HandleReadyAction[] = []

	constructor(window: BrowserWindow) {
		this.window = window
		this.menuUpdateFunctions = []

		this._settingsUnsub = subscribeToSettings((s, p) => {
			this.window.webContents.send('settingsPatch', p)
		})
	}

	getClientName() {
		let prefix = getWorkspaceNamePrefix()
		if (prefix) prefix += '_'
		return `${prefix}${getSafeComputerName()}_${this.viewID}`
	}

	getWorkspaceViewStateFilePath() {
		if (this.workspace) {
			let prefix = getWorkspaceNamePrefix()
			if (prefix) prefix += '_'
			const filename = `${this.getClientName()}.workspace`
			return path.join(this.assignedWorkspacePath, '.tangent', 'workspaces', filename)
		}
		return null
	}

	getLegacyClientName() {
		let prefix = getWorkspaceNamePrefix()
		if (prefix) prefix += '_'
		return `${prefix}${getSafeHostName()}_${this.viewID}`
	}

	getLegacyWorkspaceViewStateFilePath() {
		if (this.workspace) {
			let prefix = getWorkspaceNamePrefix()
			if (prefix) prefix += '_'
			const filename = `${this.getLegacyClientName()}.workspace`
			return path.join(this.assignedWorkspacePath, '.tangent', 'workspaces', filename)
		}
		return null
	}

	async assignWorkspace(workspace: Workspace): Promise<WorkspaceInitState> {
		this.assignedWorkspacePath = workspace.contentsStore.files.path

		if (this.workspace !== workspace) {
			if (this.workspace) {
				await dropWorkspace(this.workspace, this)
			}

			// If we are reloading the window, no need to do this
			this.workspace = workspace
			this.viewID = workspace.addObserver(this)

			const filepath = this.getWorkspaceViewStateFilePath()
			
			try {
				let workspaceViewStateContent: string

				try {
					log.info('Loading view state:', filepath)
					workspaceViewStateContent = await fs.promises.readFile(filepath, 'utf8')
				}
				catch (err) {
					// Try loading the previous filepath
					const legacyFilepath = this.getLegacyWorkspaceViewStateFilePath()
					log.info('  …not found. Checking legacy name: ', legacyFilepath)

					workspaceViewStateContent = await migrateLegacyComputerNameWorkspaceViewState(workspace.contentsStore, legacyFilepath, filepath)
					await workspace.watcherIdleHandle()
				}

				let rawState = JSON.parse(workspaceViewStateContent)
				migrate(workspace, rawState)
				this.setViewState(rawState)
				if (rawState.window_state) {
					this.restoreWindowState(rawState.window_state)
				}
			}
			catch (err) {
				log.warn('  View state load failed, resetting.')
				this.setViewState({})
			}
		}
		
		let state: WorkspaceInitState = {
			...workspace.getState(),
			workspaceView: this.viewState.getRawValues(),
			globalSettings: getSettings().getRawValues(),
			version: app.getVersion(),
			client: {
				clientName: this.getClientName()
			}
		}

		if (this.readyActions) {
			setTimeout(() => {
				for (const action of this.readyActions) {
					try {
						action(this)
					}
					catch (e) {
						log.error(`Workspace "${this.assignedWorkspacePath}" ready action failed`, e)
					}
				}
				this.readyActions = null
			}, 500)
		}

		if (workspace.initializationErrors) {
			setTimeout(() => {
				for (const error of workspace.initializationErrors) {
					this.postUserMessage('error', error)
				}
				delete workspace.initializationErrors
			}, 550)
		}

		return state
	}

	setViewState(state: any) {
		if (this.viewState) {
			let viewState = this.viewState
			viewState.dispose()

			if (this._viewStateUnsub) {
				this._viewStateUnsub()
			}
		}

		state.version = latestViewStateVersion

		let viewState = new ObjectStore({ applyToRawValues: true })
		viewState.applyPatch(state)
		viewState.setupObservables()
		this.viewState = viewState
		this._viewStateUnsub = viewState.observePatch(patch => {
			this.window.webContents.send('sendWorkspaceViewPatch', patch)
		})
	}
	
	whenReady(): Promise<WindowHandle> {
		if (this.readyActions === null) {
			return Promise.resolve(this)
		}
		return new Promise((resolve, _) => {
			this.readyActions.push(resolve)
		})
	}

	restoreWindowState(window_state: any) {
		const setPosition = (x, y) => {
			if (typeof x !== 'number' || typeof y !== 'number') return

			const display = screen.getDisplayNearestPoint({ x, y })
			if (!display) return

			const rect = display.workArea
			if (x < rect.x || x > rect.x + rect.width) {
				x = rect.x
			}
			if (y < rect.y || y > rect.y + rect.height) {
				y = rect.y
			}

			this.window.setPosition(x, y, false)
		}

		const setSize = (width, height) => {
			if (typeof width !== 'number' || typeof height !== 'number') return
			if (width < 200 || height < 200) return
			this.window.setSize(width, height, false)
		}
		
		setPosition(window_state.x, window_state.y)
		setSize(window_state.width, window_state.height)
		
		if (window_state.fullscreen) {
			this.window.setFullScreen(window_state.fullscreen)
		}
	}

	async close() {
		try {
			const settingsPath = this.getWorkspaceViewStateFilePath()
			log.info('Saving workspace ', path.basename(settingsPath))

			const viewState = this.viewState.getRawValues('file')

			// Write out window state
			const pos = this.window.getPosition()
			const size = this.window.getSize()
			const fullscreen =  this.window.isFullScreen()
			viewState.window_state = {
				x: pos[0], y: pos[1],
				width: size[0], height: size[1],
				fullscreen
			}

			await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true })
			await fs.promises.writeFile(
				settingsPath,
				JSON.stringify(viewState, null, '\t'),
				'utf8')
		}
		catch (err) {
			log.error('Could not save workspace state')
		}

		if (this._settingsUnsub) {
			this._settingsUnsub()
		}

		if (this.workspace) {
			await dropWorkspace(this.workspace, this)
		}

		this.window = null
		this.workspace = null
	}

	sendTreeChange(change: TreeChange) {
		this.window.webContents.send('treeChange', change)
	}
	
	sendFileContents(path: string, contents: FileContent) {
		log.trace(chalk.blue('Sending contents for ') + chalk.grey(path))
		if (contents instanceof ObjectStore) {
			contents = contents.getRawValues()
		}
		this.window.webContents.send('receiveFileContents', path, contents)
	}

	invokeCommand(commandId: string) {
		this.window.webContents.send('onMenuAction', commandId)
	}

	get sendPatches() { return true }

	navigateTo(target: string, form: HrefForm = 'raw') {
		const nav: { link: HrefFormedLink } = {
			link: { href: target, form }
		}
		this.window.webContents.send('workspaceAction', 'navigateTo', nav)
	}

	// TODO: These are kind of gross.
	alertCheckingForUpdate() {
		this.window.webContents.send('checking-for-update')
	}

	alertUpdateAvailable(info: UpdateInfo) {
		this.window.webContents.send('update-available', info)
	}

	alertUpdateNotAvailable() {
		this.window.webContents.send('update-not-available')
	}

	postUpdateDownloadProgress(progress: ProgressInfo) {
		this.window.webContents.send('update-progress', progress)
	}

	alertUpdateReady(info: UpdateInfo) {
		this.window.webContents.send('update-ready', info)
	}

	alertUpdateError(message, stack) {
		this.window.webContents.send('update-error', message, stack)
	}

	postUserMessage(type: string, message: string)
	postUserMessage(type: string, title: string, message: string)
	postUserMessage(type: string, messageOrTitle: string, optMessage?: string) {

		const message: UserMessage = {
			type,
			message: optMessage ?? messageOrTitle
		}

		if (optMessage) {
			message.title = messageOrTitle
		}
		this.window?.webContents?.send('message', message)
	}

	sendPastePlaintext() {
		const plainText = clipboard.readText()
		if (plainText) {
			this.window.webContents.send('pastePlaintext', plainText)
		}
	}
}
