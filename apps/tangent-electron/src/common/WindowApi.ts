import type { TreeChange } from 'common/trees'
import type { IndexData } from 'common/indexing/indexTypes'
import type { WorkspaceInitState } from 'common/workspaceState'
import type { ProgressInfo, UpdateInfo } from 'electron-updater'
import type { ContextMenuTemplate } from './menus'
import type { QueryResult } from './indexing/queryResults'
import type { QueryParseResult } from '@such-n-such/tangent-query-parser'

export interface SelectPathOptions {
	title?: string
	message?: string
	initialPath?: string
	mode?: 'file' | 'folder' | 'path'
	fileTypes?: string | string[] | RegExp
	allowExternal?: string
	selectMultiple?: boolean
}

export interface UserMessage {
	type: string
	title?: string
	message: string
}

type SelectPathResult<T extends SelectPathOptions> = T extends { selectMultiple: true } ? string[] : string

export default interface WindowAPI {
	getWorkspace(workspacePath?: string): Promise<WorkspaceInitState>
	getKnownWorkspaces(): Promise<string[]>
	forgetWorkspace(path: string)

	getWorkspaceDialog(): Promise<string>

	sendWorkspaceStatePatch(patch)
	onWorkspaceStatePatch(handler: (patch) => void)

	sendWorkspaceViewPatch(patch)
	onWorkspaceViewPatch(handler: (patch) => void)
	setWorkspaceViewState(state)

	onWorkspaceAction(handler: (actionName: string) => void)

	// Menus
	onMenuAction(handler: (actionName: string) => void)
	onGetAllMenus(handler: () => void)
	postMenuUpdate(content: { [key: string]: { [key: string]: any}})
	showContextMenu(template: ContextMenuTemplate)

	// Messages
	onMessage(handler: (message: UserMessage) => void)

	window: {
		close()
		toggleMaximize()
		minimize()
		create()
		isAlwaysOnTop(): Promise<boolean>
		setAlwaysOnTop(value: boolean)
		setSize(size: { width: number, height: number }): Promise<void>
	}

	system: {
		getAllFonts(): Promise<string[]>
		getAllLanguages(): Promise<string[]>
		saveImageFromClipboard(contextPath: string): Promise<string>
		messageDialog(options: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue>
	}

	file: {
		selectPath<T extends SelectPathOptions>(options: T): Promise<SelectPathResult<T>>
		onTreeChange(handler: (change: TreeChange) => void)

		createFile(path: string, options?: IndexData): Promise<void>
		createFolder(path: string): Promise<void>
		move(filepath: string, newPath: string): Promise<void>
		copy(filepath: string, newPath?: string): Promise<void>
		delete(filepath: string): Promise<void>
		
		/** Open a file and receive any changes via `onReceiveFileContents` */
		openFile(filepath: string)
		/** Add a handler to this to receive contents when an open file is loaded or changes. */
		onReceiveFileContents(handler: (path: string , content: string | unknown) => void)
		/** No longer watcha a file for changes. */
		closeFile(filepath: string) // Stop receiving file changes
		
		/** Update a file with new contents. */
		updateFile(filepath: string, content: string | unknown)
		/** Show the file or folder in the native file browser. */
		showInFileBrowser(path: string)
		/** Open a path in the default format */
		openPath(path: string)
	}

	edit: {
		nativeAction(action: 'cut' | 'copy' | 'paste' | 'pastePlaintext' | 'selectAll' | 'undo' | 'redo')
		onPastePlaintext(handler: (plaintext: string) => void)
	}

	links: {
		/** Open a url in the default format */
		openExternal(path: string)
		getTitle(href: string): Promise<string>
		saveFromUrl(href: string, contextPath: string): Promise<string>
	}

	query: {
		resultsForQuery(queryString: string): Promise<QueryResult>
		parseQuery(queryString: string): Promise<QueryParseResult>
	}

	settings: {
		patch(patch: any)
	}

	documentation: {
		open(name: string)
		get(name: string)
		getChangelogs(): Promise<string[]>
		getRecentChanges(): Promise<string[]>
	}

	dictionary: {
		getAllWords(): Promise<string[]>,
		removeWord(string)
	}

	update: UpdateAPI
}

export interface UpdateAPI {
	onChecking(handler: () => void)
	onAvailable(handler: (info: UpdateInfo) => void)
	onNotAvailable(handler: () => void)
	onProgress(handler: (progress: ProgressInfo) => void)
	onReady(handler: (info: UpdateInfo) => void)
	onError(handler: (message: string, stack: string) => void)

	checkForUpdate()
	update()
}
