import fs from 'fs'
import path from 'path'

import chalk from 'chalk'

import type WindowHandle from './WindowHandle'

import Watcher from 'watcher'

import { mapIterator, PromiseStarter } from '@such-n-such/core'

import { loadTreeFromPath } from './files'
import { DirectoryStoreAddResult, forAllNodes, mapTree, moveTree, shallowCopyTreeNodeWithoutChildren, TreeChange, TreeChangeMovedItem, TreeNode, validatePath } from 'common/trees'
import { HrefFormedLink, IndexData, IndexDataUpdate, StructureType } from '../common/indexing/indexTypes'
import Folder from './Folder'
import File, { FileSaveResult, FileWatcher } from './File'
import WorkspaceTreeNode from './WorkspaceTreeNode'
import { ObjectStore, applyPatch } from 'common/stores'
import { WorkspaceState } from '../common/workspaceState'
import { getRegistry } from './grammarLoader'
import Indexer from '../common/indexing/Indexer'
import IndexTreeStore from 'common/indexing/IndexTreeStore'

import Logger from 'js-logger'
import { shell } from 'electron'
import { getSettings } from './settings'
import { dataTypes, DataType } from '../common/dataTypes'
import DataFile from './DataFile'
import { knownExtensionsMatch } from '../common/fileExtensions'
import { resolveLink } from '../common/markdownModel/links'
import { getTagPath, TagTreeNode } from 'common/indexing/TagNode'
import { tokenizeTagName } from '@such-n-such/tangent-query-parser'
import Tag from './Tag'
import { isExternalLink } from 'common/links'
import migrate from './migrations/workspaceMigrator'
import { readFile } from './ioQueue'

type WatcherEvent = 'add' | 'addDir' | 'change' | 'rename' | 'renameDir' | 'unlink' | 'unlinkDir'

interface DirtyInfo {
	timeout?: ReturnType<typeof setTimeout>,
	promise?: Promise<void>
	completePromise?: () => void
}

const log = Logger.get('workspace')
const ioLog = Logger.get('workspace.io')
const fileLog = Logger.get('workspace.files')

/**
 * The Main-side workspace representation
 */
export default class Workspace {

	static readonly TANGENT_DIRECTORY = '.tangent'

	state: WorkspaceState
	contentsStore: IndexTreeStore<Folder, TagTreeNode>
	indexer: Indexer

	observers: WindowHandle[]

	private watcher: Watcher
	private dirtyCache: Map<string, DirtyInfo>
	private dataTypes: DataType[]

	initializationErrors: string[]

	private handlerIndex = 0
	private activePromiseHandlers: Map<number, Promise<unknown>>

	private createVirtualFiles = true
	private virtualFileHrefSet = new Set<string>()
	private useIOQueue = false

	constructor(root: TreeNode) {
		this.state = new WorkspaceState()
		this.state.setupObservables()

		this.dataTypes = dataTypes

		this.contentsStore = new IndexTreeStore<Folder, TagTreeNode>({
			files: mapTree(root, raw => this.nodeConstructor(raw)) as Folder,
			tags: {
				path: '#',
				name: '#',
				fileType: 'tag',
				names: [],
				children: []
			}
		})

		const settings = getSettings()
		settings.areLinksCaseSensitive.subscribe(caseSensitive => {
			if (this.contentsStore.caseSensitive !== caseSensitive) {
				this.contentsStore.caseSensitive = caseSensitive
				if (this.indexer) {
					log.info('Link case sensitivity changed: ', caseSensitive)
					this.rebuildIndex()
				}
			}
		})
		settings.debug_createVirtualFiles.subscribe(createVirtual => {
			this.createVirtualFiles = createVirtual
		})
		settings.debug_ioQueue_enable.subscribe(useQuery => {
			this.useIOQueue = useQuery
		})

		this.indexer = new Indexer({
			store: this.contentsStore,
			interop: {
				getFileContents: this.getFileContents.bind(this),
				getFileData: async <T extends ObjectStore>(node: TreeNode) => {
					if (node instanceof DataFile) {
						if (!node.data) {
							await node.cacheFile()
						}

						return node.data as T
					}
				},
				getNodeOrPlaceholder: this.getNodeOrPlaceholder.bind(this),
				updateFileContents: this.updateFileContents.bind(this),
				updateMetadata: this.updateMetadata.bind(this),
				removeVirtualFile: (virtualPath, replacementPath) => {
					let file = this.getFile(virtualPath)
					if (!file) {
						ioLog.warn('Could not remove virtual file. File not found:', virtualPath)
						return
					}

					const removedNode = this.contentsStore.remove(file)
					if (!removedNode) {
						ioLog.warn('Could not remove virtual file. File could not be removed:', virtualPath)
						return
					}

					ioLog.info(chalk.yellow('removing virtual file:'), chalk.green(file.path))
					const change: TreeChange = {
						removed: [ virtualPath ]
					}

					if (replacementPath) {
						ioLog.info(chalk.yellow('  replacing with:'), chalk.green(replacementPath))
						change.replaced = [{
							oldPath: virtualPath,
							newPath: replacementPath
						}]
					}

					this.sendTreeChange(change)
				}	
			},
			registry: getRegistry()
		})

		this.observers = []

		this.dirtyCache = new Map()
		this.activePromiseHandlers = new Map()
		const watcher = new Watcher(root.path, {
			persistent: false,
			recursive: true,
			ignoreInitial: true, // Handling our own initial tree parsing
			debounce: 0, // Handling our own event de-dupe
			ignore(path) {
				if (path.match(/(\.git)|(\/\.DS_Store$)/)) return true
				return false
			}
		})
		watcher.on('all', (eventType, fileName) => this.onFileWatchEvent(eventType, fileName))
		this.watcher = watcher
	}

	static async loadWorkspace(filepath: string, defaultsFolder?: string): Promise<Workspace> {
		const userFacingErrors: string[] = []
		
		// Ensure the true path is being loaded
		// This solves problems with situations like network drives
		// e.g. the user loads `Z:\My Workspace` which is actually `\\Some\Network\Location`
		try {
			const realpath = await fs.promises.realpath(filepath)
			if (realpath !== filepath) {
				log.info(`Workspace "${filepath}" will be loaded as "${realpath}"`)
				filepath = realpath
			}
		}
		catch (e) {
			log.error('Could not load workspace at', filepath)
			return null
		}

		// Initialize file structure now before loading in the tree
		log.info(`Loading workspace at ${filepath}`)
		userFacingErrors.push(... await migrate(filepath, defaultsFolder))

		let root: TreeNode = null
		try {
			root = await loadTreeFromPath(filepath)
		}
		catch (e) {
			log.error('Was unable to load tree from', filepath, e)
			return null
		}

		// TODO: load store workspace settings
		let workspace: Workspace = null
		try {
			workspace = new Workspace(root)
		}
		catch (e) {
			log.error('Initializing the workspace from tree failed', e)
			return null
		}

		// Initialize index
		let indexData = null
		try {
			let index = await workspace.getFileContents(path.join(
				workspace.contentsStore.files.path,
				this.TANGENT_DIRECTORY,
				'generated',
				'index.json'))
			indexData = JSON.parse(index)
		}
		catch (err) {
			log.warn('Cached index could not be read, it will now be regenerated')
			indexData = {}
		}

		try {
			await workspace.indexer.initializeFromRaw(indexData)
		}
		catch (err) {
			log.error('Index failed to initialize. Rebuilding...')
			log.log(err)

			try {
				await workspace.indexer.initializeFromRaw({})
			}
			catch (err) {
				log.error('  Rebuild failed.')
				log.log(err)
				userFacingErrors.push('The workspace index hit a critical error and failed to build.\n\nPlease send an issue with the log file.')
			}
		}

		log.info(`Loading of workspace at "${filepath}" complete`)

		if (userFacingErrors.length) {
			workspace.initializationErrors = userFacingErrors
		}

		return workspace
	}

	async close() {
		if (this.watcher) {
			log.info('Closing workspace', this.rootPath)
			this.watcher.close()

			const raw = this.indexer.getRawIndex()
			const generatedDir = path.join(
				this.contentsStore.files.path,
				Workspace.TANGENT_DIRECTORY,
				'generated')

			await fs.promises.mkdir(generatedDir, { recursive: true })
			await fs.promises.writeFile(
				path.join(generatedDir, 'index.json'),
				JSON.stringify(raw, null, '\t')
			)
		}
		else {
			log.warn('Attempted to close an already closed workspace', this.rootPath)
		}
	}

	async rebuildIndex() {

		// Remove all virtual files first
		const removedNodes: TreeNode[] = []
		this.contentsStore.conditionallyRemove(this.contentsStore.files, n => n.meta?.virtual, null, removedNodes)
		if (removedNodes.length > 0) {
			this.sendTreeChange({
				removed: removedNodes.map(n => n.path)
			})
		}

		// Remove all meta data
		for (const node of this.contentsStore.allContents()) {
			node.meta = null
		}

		// Rebuild meta data
		return this.indexer?.initializeFromRaw({})
	}

	nodeConstructor(raw: TreeNode) {
		if (raw.name.startsWith('.git')) {
			return null
		}
		if (raw.fileType === 'folder') {
			return new Folder(raw)
		}
		else {
			for (const dataType of this.dataTypes) {
				if (dataType.isType(this.contentsStore, raw)) {
					return new DataFile(this, raw, dataType)
				}
			}
			return new File(raw)
		}
	}

	getState() {
		return {
			files: mapTree(this.contentsStore.files, shallowCopyTreeNodeWithoutChildren),
			tags: mapTree(this.contentsStore.tags, shallowCopyTreeNodeWithoutChildren),
			state: this.state.getRawValues()
		}
	}

	containsPath(filepath:string): boolean {
		return filepath.startsWith(this.contentsStore.files.path)
	}

	addObserver(observer: WindowHandle) {
		let index = this.observers.indexOf(observer)
		if (index < 0) {
			index = this.observers.push(observer) - 1
		}
		return index
	}

	removeObserver(observer: WindowHandle) {
		let index = this.observers.indexOf(observer)
		if (index >= 0) {
			this.observers.splice(index, 1)
		}

		for (const node of this.contentsStore.allContents()) {
			if (node instanceof File) {
				node.dropObserver(observer)
			}
		}
	}

	private sendTreeChange(change: TreeChange) {
		for (const observer of this.observers) {
			observer.sendTreeChange(change)
		}
	}

	private sendTreeChangeExceptFor(change: TreeChange, notTo?: WindowHandle) {
		for (const observer of this.observers) {
			if (notTo === observer) continue
			observer.sendTreeChange(change)
		}
	}

	private getFile(filepath:string): File {
		let node = this.contentsStore.get(filepath)
		if (node) {
			if (node instanceof File) {
				return node
			}
			else {
				throw new Error('Trying to access node like a file: ' + filepath)
			}
		}
		return null
	}

	getNodeOrPlaceholder(link: HrefFormedLink) {
		const result = resolveLink(this.contentsStore, link)
		if (Array.isArray(result)) {
			if (result.length === 0) {
				if (!this.createVirtualFiles) {
					if (!this.virtualFileHrefSet.has(link.href)) {
						// Only do this once to minimize logging
						log.info('Would have created a virtual file from', link)
						this.virtualFileHrefSet.add(link.href)
					}
					return null
				}

				if (isExternalLink(link.href)) {
					// Do not create a virtual file for external links
					return null
				}

				// Make a virtual file
				let href = validatePath(link.href)
				if (!href) {
					return null
				}
				const extension = path.extname(href)
				if (!extension || !extension.match(knownExtensionsMatch)) {
					// Default to markdown files
					href += '.md'
				}
				const newPath = path.join(this.contentsStore.files.path, href)

				// Final check that the generated path is not already taken
				const existingNode = this.contentsStore.get(newPath)
				if (existingNode) {
					return existingNode
				}

				try {
					log.info(`Creating a virtual node from "${chalk.green(link.href)}" at "${chalk.grey(newPath)}".`)
					const newNode = this.createFile(null, newPath, IndexData.blankVirtual())

					return newNode
				}
				catch (err) {
					fileLog.error('Could not create placeholder node', err, {
						link,
						href, newPath
					})
					return null
				}
			}
			return null
		}

		if (!result && link.type === StructureType.Tag) {
			// Build out the tag structure, ensuring all parents exist
			const allNames = tokenizeTagName(link.href)
			let tagNode: TagTreeNode = null
			const added: TagTreeNode[] = []
			for (let i = 0; i < allNames.length; i++) {
				const names = allNames.slice(0, i + 1)
				const path = getTagPath(names)
				tagNode = this.contentsStore.get(path) as TagTreeNode
				if (!tagNode) {
					tagNode = new Tag(names)
					added.push(tagNode)
					this.contentsStore.add(tagNode)
				}
			}

			if (added.length) {
				this.sendTreeChange({
					added: added.map(n => shallowCopyTreeNodeWithoutChildren(n))
				})
			}

			return tagNode
		}

		return result
	}

	async getFileContents(filepath: string): Promise<string> {
		let file = this.getFile(filepath)
		if (file) {
			try {
				let contents: string
				if (this.useIOQueue) {
					contents = await readFile(file.path)
				}
				else {
					contents = await fs.promises.readFile(file.path, 'utf8')
				}
				if (contents) {
					// Sanitize windows line endings
					contents = contents.replace(/\r\n/g, '\n')
				}
				return contents
			}
			catch (err) {
				ioLog.error('Could not read', filepath)
				ioLog.error(err)
			}
		}
		return null
	}

	async ensureFolderExists(handle: WindowHandle, folderPath: string, virtual=false) {
		const queue = [] as PromiseStarter<any>[]

		this.contentsStore.ensureFolderExists(
			folderPath,
			(parent, name) => this.createFolder(
				handle,
				path.join(parent.path, name),
				virtual ? IndexData.blankVirtual() : IndexData.blank(),
				queue),
			virtual
		)

		for (const item of queue) {
			await item()
		}
	}

	createFile(handle:WindowHandle, filepath: string, meta?: IndexData) {
		// Prepair directories for a new file, virtual or otherwise
		const folderPath = path.dirname(filepath)

		const ensureTask = this.ensureFolderExists(handle, folderPath, meta?.virtual)

		// Check for an existing, virtual file
		const existingFile = this.getFile(filepath) || this.indexer.getBestVirtualFile(filepath) as File
		if (existingFile?.meta?.virtual) {

			if (meta) {
				applyPatch(existingFile.meta, meta, {
					applyToRawValues: true
				})
			}

			if (existingFile.path !== filepath) {
				log.info('Moving existing virtual file')
				this.trackActivePromise(this.move(existingFile.path, filepath))
			}

			existingFile.meta.virtual = false

			if (handle) {
				existingFile.addObserver(handle)
			}

			this.sendTreeChangeExceptFor({
				changed: [ shallowCopyTreeNodeWithoutChildren(existingFile) ]
			}, handle)

			return existingFile
		}

		// Make a new file
		let extension = path.extname(filepath)
		let rawNode: TreeNode = {
			path: filepath,
			name: path.basename(filepath, extension),
			fileType: extension,
			meta: meta || IndexData.blank()
		}

		let file = this.nodeConstructor(rawNode) as File
		const addResult = this.contentsStore.add(file)
		if (addResult > 0) {
			if (!file.meta?.virtual) {

				let creationTask: Promise<any> = ensureTask.then(() => file.initializeContents())
				if (handle) {
					creationTask = creationTask.then(() => file.addObserver(handle))
				}

				this.trackActivePromise(creationTask)
			}
		}
		else {
			throw new Error('File could not be added. ' + DirectoryStoreAddResult.describe(addResult) + ' File: ' + filepath)
		}
		
		if (!meta?.virtual) {
			// HACK? This is relying on the fact that nothing is creating a virtual
			// file except the indexer. Not amazing.
			this.trackActivePromise(this.indexer.handleNodeRename(file))
		}
		
		this.sendTreeChangeExceptFor({
			added: [ shallowCopyTreeNodeWithoutChildren(file) ]
		}, handle)

		return file
	}

	/**
	 * Creates a folder.
	 * @param handle The handle that quested creation of the folder. Will not recieve creation messages as it is assumed it already has created a tracking node. 
	 * @param folderPath The path of the folder that will be created.
	 * @param meta Any metadata for the folder. A virtual folder will not be created.
	 * @param queue A queue of io tasks that need to be completed before actual file creation can occur. Critical for `ensureFolderExists()`.
	 * @returns The Folder representing the folder on disk.
	 */
	createFolder(handle: WindowHandle, folderPath: string, meta?: IndexData, queue?: PromiseStarter<any>[]) {

		// Check for an existing folder
		const existingFolder = this.contentsStore.get(folderPath)
		if (existingFolder?.meta?.virtual) {
			if (meta) {
				applyPatch(existingFolder.meta, meta, {
					applyToRawValues: true
				})
			}

			if (!meta?.virtual) {
				// Create the folder if it was virtual
				existingFolder.meta.virtual = false 
				if (queue) {
					queue.push(() => fs.promises.mkdir(folderPath, { recursive: true }))
				}
				else {
					this.trackActivePromise(fs.promises.mkdir(folderPath, { recursive: true }))
				}

				this.sendTreeChangeExceptFor({
					changed: [ shallowCopyTreeNodeWithoutChildren(existingFolder) ]
				}, handle)
			}
			
			return existingFolder
		}

		// Make a new folder
		let rawNode: TreeNode = {
			path: folderPath,
			name: path.basename(folderPath),
			fileType: 'folder'
		}

		if (meta) {
			rawNode.meta = meta
		}

		let folder = this.nodeConstructor(rawNode) as Folder
		const addResult = this.contentsStore.add(folder)
		if (addResult > 0) {
			if (!meta?.virtual) {
				if (queue) {
					// This queue mechanism is really awkward. It would be nice if there
					// was some kind of primitive "do X but also async Y after async Z" I could use here.
					queue.push(() => fs.promises.mkdir(folderPath, { recursive: true }))
				}
				else {
					this.trackActivePromise(fs.promises.mkdir(folderPath, { recursive: true }))
				}
			}
		}
		else {
			throw new Error('Folder could not be added. ' + DirectoryStoreAddResult.describe(addResult))
		}

		this.sendTreeChangeExceptFor({
			added: [ shallowCopyTreeNodeWithoutChildren(folder) ]
		}, handle)

		return folder
	}

	openFile(handle: FileWatcher, filepath: string) {
		let file = this.getFile(filepath)
		if (file) {
			file.addObserver(handle)
		}
	}

	dropFile(handle: FileWatcher, filepath: string) {
		let file = this.getFile(filepath)
		if (file) {
			file.dropObserver(handle)
			if (file.observers.length === 0 && file.state === 'deleted' && this.contentsStore.remove(file)) {
				this.sendTreeChange({
					removed: [file.path]
				})
			}
		}
	}

	async move(filepath: string, newPath: string) {
		const node = this.contentsStore.get(filepath)
		if (!node) {
			throw new Error('Cannot move; file not found in the index: ' + filepath)
		}
		
		const existingNode = this.contentsStore.get(newPath)
		if (existingNode) {
			if (existingNode.meta?.virtual) {
				// Stomp the virtual file, follow up later
				this.contentsStore.remove(existingNode)
			}
			else {
				// Reject the name change by moving the node to the same place
				ioLog.warn(chalk.red('Move rejected'), chalk.grey(filepath), chalk.gray(newPath))

				this.sendTreeChange({
					moved: [{
						oldPath: node.path,
						node: shallowCopyTreeNodeWithoutChildren(node)
					}]
				})
				return
			}
		}

		this.contentsStore.remove(node)

		ioLog.info(chalk.yellow('Moving ') + chalk.grey(node.path))
		ioLog.info(chalk.yellow('      to ') + chalk.grey(newPath))

		const change: TreeChange = {
			moved: moveTree(node, newPath)
		}

		if (existingNode) {
			// Send the removal of the existing node so the moved node can take its place.
			change.removed = [existingNode.path]
		}

		this.contentsStore.add(node)

		this.sendTreeChange(change)

		if (existingNode) {
			// Make sure the new node has all of the same linkages as the moved node
			// This should only happen if the existing node was virtual
			if (existingNode.meta.inLinks) {
				const meta = node.meta || (node.meta = IndexData.blank())
				const theLinks = meta.inLinks || (meta.inLinks = [])
				for (const link of existingNode.meta.inLinks) {
					theLinks.push(link)
				}

				this.updateMetadata([{
					path: node.path,
					meta: node.meta
				}])
			}
		}

		let tasks: Promise<unknown>[] = [this.indexer.handleNodeRename(node, filepath)]

		if (!node.meta?.virtual) {
			tasks.push(fs.promises.rename(filepath, newPath))
		}

		await Promise.all(tasks)
	}

	async copy(filepath: string, newPath?: string) {
		const nodeToCopy = this.contentsStore.get(filepath)
		if (!nodeToCopy) {
			throw new Error('Cannot copy; path not found in the inde: ' + filepath)
		}

		newPath = newPath ?? nodeToCopy.path
		newPath = this.contentsStore.getUniquePath(newPath)
		
		const newRawNode = shallowCopyTreeNodeWithoutChildren(nodeToCopy)
		newRawNode.meta = IndexData.blank()
		newRawNode.path = newPath
		newRawNode.name = path.basename(newPath, newRawNode.fileType !== 'folder' ? newRawNode.fileType : undefined)

		const newNode = this.nodeConstructor(newRawNode)
		const addResult = this.contentsStore.add(newNode)
		if (addResult > 0) {
			this.sendTreeChange({
				added: [ newRawNode ]
			})
		}
		else {
			throw new Error('File could not be added. ' + DirectoryStoreAddResult.describe(addResult) + ' File: ' + newRawNode.path)
		}

		ioLog.info(chalk.green('Moving'), chalk.gray(filepath), 'to', chalk.gray(newPath))

		await fs.promises.cp(nodeToCopy.path, newPath, { recursive: true })
	}

	async delete(filepath: string) {
		const nodeToDelete = this.contentsStore.get(filepath)
		if (!nodeToDelete) {
			throw new Error('Cannot delete; path not found in the index: ' + filepath)
		}
		ioLog.info(chalk.green('Deleting'), chalk.gray(filepath))

		// TODO: This may want to be some kind of external handler system?
		if (shell && getSettings()?.debug_sendItemsToTrash.value) {
			await shell.trashItem(filepath)
		}
		else {
			// fall back to normal fs
			await fs.promises.rm(filepath, { force: true, recursive: true })
		}

		// Send node removal messages immediately rather than wait for io lag
		this.removeTreeRetainingVirtuals(nodeToDelete)
	}

	async updateFileContents(filepath: string, contents: string, updater?: WindowHandle): Promise<FileSaveResult> {
		let file = this.getFile(filepath)
		if (file) {
			if (file.observers.length === 0) {
				fileLog.info('Updating a file with no observers', {
					filepath
				})
			}

			try {
				const fileSaveResult = await file.setContents(contents, updater)
				if (fileSaveResult !== FileSaveResult.Success) {
					return fileSaveResult
				}
			}
			catch (err) {
				fileLog.error('Failed to set contents of', filepath, err)
				return FileSaveResult.Failed
			}

			try {
				await this.indexer.onFileContentChanged(filepath, contents)
				return FileSaveResult.Success
			}
			catch (err) {
				fileLog.error('Reindexing of updated file failed:', filepath, err)
				return FileSaveResult.Failed
			}
		}
		else {
			fileLog.error('Tried to update a file that was not in the store', filepath)
		}
		return FileSaveResult.Failed
	}

	updateMetadata(updates: IndexDataUpdate[], updater?: WindowHandle) {
		let changedNodes = []
		for (let data of updates) {
			const node = this.contentsStore.get(data.path)
			if (node) {
				let form = data.form ?? 'set'
				if (form === 'set' || !node.meta) {
					node.meta = data.meta
				}
				else if (form === 'patch') {
					applyPatch(node.meta, data.meta, { 
						applyToRawValues: true
					})
				}

				changedNodes.push(shallowCopyTreeNodeWithoutChildren(node))
			}
			else {
				fileLog.error('Tried to update file metadata that was not in the store', data.path)
			}
		}

		if (changedNodes.length) {
			let treeChange: TreeChange = {
				changed: changedNodes
			}
			for (let observer of this.observers) {
				if (observer === updater) {
					continue
				}

				observer.sendTreeChange(treeChange)
			}
		}
	}

	/** Returns a promise that resolves when the file watcher is done processing */
	async watcherIdleHandle() {
		if (this.dirtyCache.size > 0) {
			await Promise.all([...mapIterator(this.dirtyCache.values(), v => {
				return v.promise
			})])
			return this.watcherIdleHandle()
		}
		if (this.activePromiseHandlers.size > 0) {
			await Promise.all([...this.activePromiseHandlers.values()])
			return this.watcherIdleHandle()
		}
	}

	private onFileWatchEvent(watcherEvent: WatcherEvent, filepath: string) {
		// Explicitely ignore these files
		if (!filepath) {
			console.error('No filename?', watcherEvent, filepath)
			return
		}

		ioLog.debug('watch event: ' + chalk.red(watcherEvent) + ' ' + chalk.green(filepath))

		// TODO: Parent paths should take precidence over child paths
		let dirtyInfo = this.dirtyCache.get(filepath)
		if (dirtyInfo) {
			if (dirtyInfo.timeout) {
				clearTimeout(dirtyInfo.timeout)
			}
		}
		else {
			dirtyInfo = {}
			dirtyInfo.promise = new Promise((resolve, reject) => {
				dirtyInfo.completePromise = resolve
			})
			this.dirtyCache.set(filepath, dirtyInfo)
		}

		dirtyInfo.timeout = setTimeout(() => this.onDirtyCacheTimeout(filepath), 500)
	}

	private onDirtyCacheTimeout(filepath: string) {
		let dirtyInfo = this.dirtyCache.get(filepath)
		if (!dirtyInfo) {
			ioLog.error('Attempted to respond to file change, but dirtyCache was empty:', filepath)
			return
		}

		this.dirtyCache.delete(filepath)

		let handler = this.resolveDirtyCache(filepath, dirtyInfo)
		dirtyInfo.completePromise()

		this.trackActivePromise(handler)
	}

	private trackActivePromise(handler: Promise<unknown>) {
		const handlerIndex = this.handlerIndex++

		this.activePromiseHandlers.set(handlerIndex, handler.then(() => {
			this.activePromiseHandlers.delete(handlerIndex)
		}, err => {
			this.activePromiseHandlers.delete(handlerIndex)
			console.log('  Promise', handlerIndex, 'failed to complete successfully', err)
			log.error('  Promise', handlerIndex, 'failed to complete successfully', err)
		}))
	}

	private async tryGetRealPath(filepath: string) {
		try {
			return await fs.promises.realpath(filepath)
		}
		catch {
			return filepath
		}
	}

	private async resolveDirtyCache(filepath: string, dirtyInfo: DirtyInfo) {
		const asyncHandles: Promise<void>[] = []

		// Differentiate between the incoming path and the true path
		// This is important when a file is re-cased on non-case-sensitive file systems.
		// (e.g. File.md -> file.md) 
		const originalPath = filepath
		const realpath = await this.tryGetRealPath(filepath)

		const newTree = await loadTreeFromPath(realpath)
		if (newTree === null) {
			// Parsing failed, this realpath no longer exists
			ioLog.info(chalk.red('Node Removed'), chalk.grey(realpath))

			// In this case, we _don't_ want to fix up file path changes
			// In a case-insensivite system, either real or original path will be hit,
			// but we're actually going to have the original path cached
			const existingTree = this.contentsStore.get(originalPath)
			if (existingTree) {

				this.removeTreeRetainingVirtuals(existingTree, node => {
					// Don't delete files currently being observed
					return (node instanceof File) ? node.observers.length === 0 : true
				})
			}
		}
		else {
			let moved: TreeChangeMovedItem[] = null

			if (originalPath !== realpath) {
				// This happens in re-casing (e.g. File.md -> file.md)
				// When re-casing through Workspace.move(), this should be handled already
				const original = this.contentsStore.get(originalPath)
				if (original) {
					// Prepare for integration
					this.contentsStore.remove(original)
					moved = moveTree(original, realpath)
					this.contentsStore.add(original)
				}
			}

			// There are new nodes here, bring them in
			let newNode = this.contentsStore.integrate(newTree, (existing, incoming) => {
				if (existing) {
					ioLog.debug(chalk.green('Integrating to existing node'), chalk.grey(realpath))
					if (incoming) {
						if (existing instanceof WorkspaceTreeNode) {
							if (existing.state === 'deleted') {
								existing.state = 'idle'
							}
							existing.name = incoming.name
							existing.created = incoming.created
							existing.modified = incoming.modified
							existing.onExternalChange()
						}
						if (existing.meta?.virtual) {
							existing.meta.virtual = false
						}
					}
					return existing
				}
				else {
					ioLog.info(chalk.green('Node Added'), chalk.grey(realpath))
					return this.nodeConstructor(incoming)
				}
			})

			// Prepare the change
			const change: TreeChange = {
				// Added nodes are integrated
				added: [ mapTree(newNode, shallowCopyTreeNodeWithoutChildren) ]
			}

			if (moved) {
				// Handle external re-cased renames
				// This is duplicate work (nodes are moved and then integrated)
				// However, this is very unlikely to happen
				change.moved = moved
			}

			// Notify observers of the new content
			this.sendTreeChange(change)

			for (const n of change.added) {
				if (this.indexer.isParseableFile(n)) {
					asyncHandles.push(this.getFileContents(n.path).then(c => 
						this.indexer.onFileContentChanged(n.path, c)))
				}
			}
		}

		return Promise.all(asyncHandles)
	}

	private removeTreeRetainingVirtuals(target: TreeNode, extraRemovalCondition?: (node: TreeNode) => boolean) {

		let removed: TreeNode[] = []
		let retained: TreeNode[] = []

		// Remove the effects of all outgoing links
		forAllNodes(target, node => {
			this.indexer.onFileContentChanged(node, '')
		})

		// Remove affected nodes, retaining open files & potential virtual files
		const removalResult = this.contentsStore.conditionallyRemove(target, node => {
			const extraRetain = extraRemovalCondition ? extraRemovalCondition(node) : true
			return extraRetain && !node.meta?.inLinks?.length
		}, null, removed)
		
		if (removalResult) {
			// Can just send the removal of the parent node
			removed = [target]
		}
		else {
			// The tree is still alive, and we need to clean it up
			forAllNodes(target, node => {
				if (node instanceof WorkspaceTreeNode) {
					ioLog.info(chalk.yellow('  Retaining Node as virtual'), node.state, chalk.gray(node.path))
					if (node.meta?.inLinks?.length || node.fileType === 'folder') {
						node.state = 'idle'
					}
					else {
						// Extra retain conditions still mark node as deleted
						node.state = 'deleted'
					}
					if (!node.meta) node.meta = IndexData.blank()
					node.meta.virtual = true
				}

				retained.push(node)
			})
		}

		if (removed.length || retained.length) {
			// Notify observers that the node is gone
			this.sendTreeChange({
				removed: removed.length ? removed.map(r => r.path) : undefined,
				changed: retained.length ? retained.map(r => shallowCopyTreeNodeWithoutChildren(r)) : undefined
			})
		}
	}

	getAttachmentPath(idealFilepath: string, contextPath: string): string {
		const contextDir = path.dirname(contextPath) // TODO: Use this
		let targetDirectory = getSettings().defaultPasteLocation.value
		if (!targetDirectory) {
			targetDirectory = this.rootPath
		}
		else if (targetDirectory.match(/^\.\.?[\\\/]/)) {
			targetDirectory = path.resolve(path.join(contextDir, targetDirectory))
			if (!targetDirectory.startsWith(this.rootPath)) {
				log.info('Relative attachment path would have brought us outside the workspace. Will use the root instead. Original:', targetDirectory)
				targetDirectory = this.rootPath
			}
		}
		else {
			targetDirectory = path.join(this.rootPath, targetDirectory)
		}

		return this.contentsStore.getUniquePath(path.join(targetDirectory, idealFilepath))
	}

	get rootPath() {
		return this.contentsStore?.files?.path
	}
}
