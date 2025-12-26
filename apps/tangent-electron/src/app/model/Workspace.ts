import type WindowApi from 'common/WindowApi'
import { type ClientInfo, type WorkspaceInitState, WorkspaceState } from 'common/workspaceState'

import { type TreeNode, type TreeChange, mapTree, DirectoryStore, DirectoryStoreAddResult } from 'common/trees'

import File from './File'

import WorkspaceViewState from './WorkspaceViewState'

import workspaceCommands, { Command, type WorkspaceCommands } from './commands'
import paths from 'common/paths'
import NoteFile from './NoteFile'
import Folder from './Folder'
import WorkspaceTreeNode from './WorkspaceTreeNode'
import { EventDispatcher } from 'typewriter-editor/dist/util/EventDispatcher'
import WorkspaceCommand from './commands/WorkspaceCommand'
import UpdateState from './UpdateState'
import { NoteViewState } from './nodeViewStates'
import Settings from 'common/settings/Settings'
import { EmbedType, getEmbedType } from 'common/embedding'
import EmbedFile from './EmbedFile'
import { buildMainMenu, type ContextMenuCommand, type ContextMenuConstructorOptions, extractRawTemplate, prepareContextMenuCommands, prepareMainMenuForElectron, type SplitContextMenuTemplate } from './menus'
import DataFile from './DataFile'
import { dataTypes, type DataType } from 'common/dataTypes'
import type WorkspaceSettings from 'common/dataTypes/WorkspaceSettings'
import { WritableStore } from 'common/stores'
import { noteExtensionMatch } from 'common/fileExtensions'
import { resolveLink } from 'common/markdownModel/links'
import type { NavigationData } from 'app/events'
import { isExternalLink } from 'common/links'
import { MapStrength } from 'common/tangentMap/MapNode'
import { getNode, isReference } from 'common/nodeReferences'
import IndexTreeStore from 'common/indexing/IndexTreeStore'
import type { TagTreeNode } from 'common/indexing/TagNode'
import Tag from './Tag'
import CreateNewFolderCommand from './commands/CreateNewFolder'
import { FocusLevel } from 'common/dataTypes/TangentInfo'
import CustomStyleManager from 'app/style/CustomStyleManager'
import { type HrefFormedLink } from 'common/indexing/indexTypes'
import { type Readable, derived, readable } from 'svelte/store'
import NodeHandle, { type HandleResult } from './NodeHandle'
import { swapRemove, wait } from '@such-n-such/core'
import CodeThemeManager from 'app/style/CodeThemeManager'
import CreationRule from 'common/settings/CreationRule'

const menuContext = {}

type CreateTreeNodeOptions = {
	node: TreeNode
	sendCreationMessage?: boolean
	ensureParents?: boolean
}

export default class Workspace extends EventDispatcher {

	api: WindowApi

	directoryStore: IndexTreeStore<Folder, TagTreeNode>
	private dataTypes: DataType[]
	private activeHandles: NodeHandle[] = []
	
	state: WorkspaceState
	viewState: WorkspaceViewState

	settings: Settings
	workspaceSettings = new WritableStore<WorkspaceSettings>(null)
	workspaceFolder: Folder
	tagsFolder: Folder
	tangentsFolder: Folder

	commands: WorkspaceCommands
	private commandUnsubs:  (() => void)[]
	private dirtyCommands: WorkspaceCommand[] = []

	updateState: UpdateState

	private contextMenuCommands: Map<string, ContextMenuCommand>

	codeThemeManager: CodeThemeManager
	styleManager: CustomStyleManager

	version: string
	client: ClientInfo

	debug = {
		treeChanges: false,
		fileCreation: false
	}

	constructor(state: Partial<WorkspaceInitState>, api: WindowApi) {
		super()
		this.api = api

		api.file.onTreeChange(change => {
			try {
				this.onReceivedTreeChange(change)
			}
			catch (e) {
				console.error('onTreeChange handler failed')
				console.log(e)
			}
		})
		api.file.onReceiveFileContents((path, content) => {
			try {
				this.onReceiveFileContents(path, content)
			}
			catch (e) {
				console.error('Receieve File Contents handler failed')
				console.log(e)
			}
		})

		this.dataTypes = dataTypes

		this.nodeConstructor = this.nodeConstructor.bind(this)
		this.directoryStore = new IndexTreeStore<Folder, TagTreeNode>({
			files: mapTree(state.files, this.nodeConstructor) as Folder,
			tags: mapTree(state.tags, this.nodeConstructor) as TagTreeNode
		})


		// Ensure core directories exist
		// FIXME: Creating this here so that the command exists (as the commands are created later)
		// Some commands need a (more) fully initialized workspace, and these folders are prerequisites for some of that
		// It's a bit of a mess.
		const folderCreator = new CreateNewFolderCommand(this)
		this.workspaceFolder = folderCreator.execute({
			name: '.tangent',
			updateSelection: false,
			creationMode: 'createOrOpen'
		})

		const workspaceFolderCreator = (folderName: string) => {
			return folderCreator.execute({
				name: folderName,
				parent: this.workspaceFolder,
				updateSelection: false,
				creationMode: 'createOrOpen'
			})
		}

		this.tagsFolder = workspaceFolderCreator('tags')
		this.tangentsFolder = workspaceFolderCreator('tangents')


		this.version = state.version
		this.client = state.client

		// Initialize state
		this.state = new WorkspaceState()
		this.state.applyPatch(state.state)
		this.state.setupObservables()
		api.onWorkspaceStatePatch(patch => this.state.applyPatch(patch))
		this.state.observePatch(patch => api.sendWorkspaceStatePatch(patch))

		this.viewState = new WorkspaceViewState(this)

		this.settings = new Settings()
		this.settings.observePatch(patch => api.settings.patch(patch))

		this.commands = workspaceCommands(this)
		this.commandUnsubs = Object.keys(this.commands).map(key => {
			const command = this.commands[key]
			return command.subscribe(() => {
				if (!this.dirtyCommands.length) {
					wait().then(() => {
						const payload: any = {}
						for (const command of this.dirtyCommands) {
							payload[command.id] = this.translateCommandToMenu(command)
						}
						api.menus.updateCommandState(payload)
						this.dirtyCommands = []
					})
				}
				this.dirtyCommands.push(command)
			})
		})

		this.viewState.initializeWithState(state.workspaceView)
		this.settings.applyPatch(state.globalSettings || {})

		this.settings.areLinksCaseSensitive.subscribe(caseSensitive => {
			this.directoryStore.caseSensitive = caseSensitive
			this.directoryStore.notifyChanged()

			for (const handle of this.activeHandles) {
				handle.dirty = true
				handle.pushChangesIfDirty()
			}
		})

		const sendMainMenu = () => {
			const template = buildMainMenu(this)
			const electronTemplate = prepareMainMenuForElectron(template)

			try {
				this.api.menus.setMainMenu(electronTemplate)
			}
			catch (e) {
				console.error('Could not send main menu', e, electronTemplate)
			}
		}

		this.settings.keymap.subscribe(keymap => {
			// Revert to default
			for (const key of Object.keys(this.commands)) {
				const command = this.commands[key]
				command.shortcuts = command.defaultShortcuts?.slice()
			}

			// Apply mappings
			for (const key of keymap.keys())
			{
				const shortcuts = keymap.get(key)
				const command = this.commands[key]
				if (command) {
					command.shortcuts = shortcuts
				}
			}

			sendMainMenu()
		})

		api.onWorkspaceAction((actionName, ...payload) => {
			if (this[actionName]) {
				try {
					this[actionName](...payload)
				}
				catch (e) {
					console.error(`Could not invoke workspace action "${actionName}"`)
					console.log(e)
				}
			}	
		})

		api.menus.onMenuCommand(async commandId => {
			try {
				if (this.contextMenuCommands) {
					const contextCommand = this.contextMenuCommands.get(commandId)
					if (contextCommand) {
						const { command, commandContext, click } = contextCommand
						if (command instanceof WorkspaceCommand) {
							console.log('Firing context command:', command)
							const context = commandContext || {}
							if (command.canExecute(context)) {
								await command.execute(context)
							}
						}

						if (click) {
							click()
						}
						
						return
					}
				}

				// TODO: Menu items should be disabled when in modal state
				// I don't want to do that manually for every single command
				if (this.viewState.modal.isActive) {
					console.log('Denied! Modal is open.')
					return
				}
				const command = this.commands[commandId]
				if (command) {
					if (command.canExecute(menuContext)) {
						console.log('Invoking command', commandId, 'from main')
						command.execute(menuContext)
					}
				}
				else {
					console.error('No command found for', commandId)
				}
			}
			catch (err) {
				console.error('Failed to run command', commandId)
				console.error(err)
			}
		})

		api.menus.onRequestAllMenus(sendMainMenu)

		this.updateState = new UpdateState(api.update)

		this.codeThemeManager = new CodeThemeManager(this)
		this.styleManager = new CustomStyleManager(this)
	}

	async startup() {

		const promises = []

		// Load/create any necessary settings files
		const workspaceSettingsFile = this.commands.createNewFile.execute({
			name: 'workspace-settings',
			extension: '.json',
			folder: this.workspaceFolder,
			creationMode: 'createOrOpen',
			updateSelection: false
		}) as DataFile

		promises.push(workspaceSettingsFile.loadData<WorkspaceSettings>().then(settings => {
			this.workspaceSettings.set(settings)
		}))

		promises.push(this.viewState.startup().catch(err => {
			console.error('Tangent View State failed Startup()', err)
		}))

		await Promise.all(promises)
	}

	/*
	 * Utility Functions
	 */
	nodeConstructor(raw: TreeNode) {
		if (!raw) {
			this.api.postMessage({
				type: 'error',
				title: 'File Model Error',
				message: 'The workspace attempted to construct a null node. This is invalid. Please reach out to the developers with your logs.'
			})
			return null
		}
		if (typeof raw.fileType !== 'string') {
			this.api.postMessage({
				type: 'error',
				title: 'File Model Error',
				message: 'The workspaces attempted to construct a node with an invalid fileType field. Please reach out to the developers with your logs.'
			})
			console.error('Tree node has an invalid filetype:', raw)
			return null
		}
		switch (raw.fileType) {
			case 'folder':
				return new Folder(raw, this)
			case 'tag':
				return new Tag(raw, this)
			default:
				if (raw.fileType.match(noteExtensionMatch)) {
					return new NoteFile(raw, this)
				}
				else if (getEmbedType(raw) !== EmbedType.Invalid) {
					return new EmbedFile(raw, this)
				}
				else {
					for (const dataType of this.dataTypes) {
						if (dataType.isType(this.directoryStore, raw)) {
							return new DataFile(dataType, raw, this)
						}
					}
				}
				return raw
		}
	}

	nodeIntegrator(existing: TreeNode, incoming: TreeNode) {
		if (existing) {
			if (existing instanceof WorkspaceTreeNode) {
				existing.integrateFrom(incoming)
			}
			else {
				existing.meta = incoming.meta
				existing.created = incoming.created
				existing.modified = incoming.modified
			}
			return existing
		}
		else if (incoming) {
			const newNode = this.nodeConstructor(incoming)
			return newNode
		}
		return null
	}

	isPreviewBuild() {
		return this.version.match(/alpha|beta/) != null
	}

	/*
	 * Event Handlers
	 */
	onReceivedTreeChange(change: TreeChange) {
		let changed = false
		// Remove items first
		if (change.removed) {
			for (const filepath of change.removed) {
				const deleted = this.directoryStore.remove(filepath)
				if (deleted) {
					changed = true
				}
			}
		}
		// Move things that still exist
		if (change.moved) {
			for (let item of change.moved) {
				let existingNode = this.directoryStore.get(item.oldPath)
				if (existingNode) {
					this.directoryStore.remove(existingNode)
					existingNode.path = item.node.path
					existingNode.name = item.node.name
					existingNode.fileType = item.node.fileType
					existingNode.created = item.node.created
					existingNode.modified = item.node.modified
					const result = this.directoryStore.add(existingNode)
					if (result !== DirectoryStoreAddResult.Success) {
						console.error('Did not move', item, DirectoryStoreAddResult.describe(result), change)
					}
				}
				else {
					changed = this.directoryStore.integrate(
						item.node,
						(e, i) => this.nodeIntegrator(e, i)
					) != null || changed
				}
			}
		}
		// Add after move so that new children of moved entities land correctly
		if (change.added) {
			for (let newNode of change.added) {
				changed = this.directoryStore.integrate(
					newNode,
					(e, i) => this.nodeIntegrator(e, i)
				) != null || changed
			}
		}
		// Changed last
		if (change.changed) {
			for (let item of change.changed) {
				let existingNode = this.directoryStore.get(item.path)
				if (existingNode) {
					this.nodeIntegrator(existingNode, item)
				}
			}
			changed = true
		}

		this.viewState.tangent.onTreeChange(change)

		if (changed) {
			if (this.debug.treeChanges) {
				console.log('tree change: ', change)
			}
			this.directoryStore.notifyChanged()

			const start = performance.now()
			for (const handle of this.activeHandles) {
				handle.checkTreeChange(change)
				if (handle.dirty) {
					handle.resolve()
				}
				handle.pushChangesIfDirty()
			}
			const end = performance.now()
			if (this.debug.treeChanges) {
				console.log(`Updated ${this.activeHandles.length} node handles in ${end - start}ms`)
			}
		}
	}

	onReceiveFileContents(path: string, content: unknown) {
		let file = this.directoryStore.get(path)
		if (file && file instanceof File) {
			file.setFileContent(content)
			file.notifyChanged()
		}
	}

	/*
	 * Store Handling
	 */
	getHandle(path: string): Readable<HandleResult>
	getHandle(node: TreeNode): Readable<HandleResult>
	getHandle(link: HrefFormedLink): Readable<HandleResult>
	getHandle(arg: string | TreeNode | HrefFormedLink): Readable<HandleResult> {
		let node: WorkspaceTreeNode = null
		let link: HrefFormedLink
		if (typeof arg === 'string') {
			link = {
				form: 'raw',
				href: this.directoryStore.unknownStringToPath(arg)
			}
		}
		else if (arg instanceof WorkspaceTreeNode) {
			node = arg
		}
		else if ('href' in arg) {
			link = arg
		}
		else {
			link = {
				form: 'raw',
				href: arg.path
			}
		}

		return readable<HandleResult>(null, set => {

			const handle = new NodeHandle(this, set, node, link)
			this.activeHandles.push(handle)

			handle.resolve()
			handle.pushChangesIfDirty()

			return () => swapRemove(this.activeHandles, handle)
		})
	}

	/**
	 * Creates & adds a new tree node to the directoryStore.
	 * @param options.node The raw node to add.
	 * @param options.ensureParents Create any parent nodes if necessary (default true).
	 * @param options.sendCreationMessage Send the creation request to the backend (default true).
	 */
	createTreeNode(options: CreateTreeNodeOptions): TreeNode
	createTreeNode(options: CreateTreeNodeOptions & { async: true }): Promise<TreeNode>
	createTreeNode(options: CreateTreeNodeOptions & { paired: true }): { node: TreeNode, onComplete: Promise<void> }
	createTreeNode(options: CreateTreeNodeOptions & { async?: true, paired?: true}) {
		let node = options.node

		if (options.ensureParents ?? true) {
			// Ensure any parent folders exist.
			// Don't need to send creation messages here.
			// Creation in the backend will handle it.
			this.ensureFolderExists(paths.dirname(node.path), false, false)
		}

		let onComplete: Promise<void> = null

		if (options.sendCreationMessage ?? true) {
			// Send off the node to be created
			if (node.fileType === 'folder') {
				onComplete = this.api.file.createFolder(node.path)
			}
			else {
				onComplete = this.api.file.createFile(node.path)
			}
		}

		// Propegate a stub of the node for real
		if (!(node instanceof WorkspaceTreeNode)) {
			node = this.nodeConstructor(node)
		}

		const result = this.directoryStore.add(node)
		if (result !== DirectoryStoreAddResult.Success) {
			console.error('Error creating', node.path, DirectoryStoreAddResult.describe(result))
		}
		this.directoryStore.notifyChanged()
		
		// Simulate the tree change so handles can react immediately
		const change: TreeChange = {
			added: [
				node
			]
		}

		// These can be null when doing first time workspace initialization
		this.viewState?.tangent?.onTreeChange(change)

		for (const handle of this.activeHandles) {
			handle.checkTreeChange(change)
			handle.pushChangesIfDirty()
		}

		if (options.async) return onComplete.then(() => node)
		if (options.paired) return { node, onComplete }

		return node
	}

	ensureFolderExists(folderPath: string, virtual=false, sendCreationMessage=true) {
		return this.directoryStore.ensureFolderExists(
			folderPath,
			(parent, name) => {
				const node: TreeNode = {
					path: paths.join(parent.path, name),
					name,
					fileType: 'folder'
				}

				if (virtual) {
					// This meta value is only used localy. Therefor, the blank uuid should be replaced once actually created.
					node.meta = { uuid: '', virtual: true }
				}

				return this.createTreeNode({
					node, sendCreationMessage, ensureParents: false
				})
			},
			virtual
		)
	}

	/*
	 * Command Handling
	 */
	private translateCommandToMenu(command: Command) {
		let result:any = {
			enabled: command.canExecute(menuContext)
		}
		const checked = command.getChecked(menuContext)
		if (checked !== undefined && checked !== null) {
			result.checked = checked
		}
		return result
	}

	/*
	 * Actions
	 */
	navigateTo(navigationData: NavigationData) {

		let { link, target, origin, tangent, direction } = navigationData

		if (!link && !target) {
			throw new Error('Either `link` or `target` must be provided.')
		}

		if (link && isExternalLink(link.href)) {
			this.api.links.openExternal(link.href)
			return
		}

		if (!target) {
			const resolution = resolveLink(this.directoryStore, link)
			if (typeof resolution === 'string') {
				// This only occurs in md links that do not resolve to the workspace
				console.log('Link undetermined, opening locally:', resolution)
				this.api.file.openPath(resolution)
				return
			}
			else if (resolution && !Array.isArray(resolution)) {
				target = resolution
			}
			else if (link.form === 'wiki') {
				console.log('Link goes nowhere, creating new file', navigationData)

				const newFile = this.commands.createNewFile.execute({
					relativePath: link.href,
					extension: 'default-md',
					// Will modify selection later
					updateSelection: false
				})
				
				if (newFile instanceof File) {
					// Don't need to rename the note
					newFile.loadState = 'loaded'
				}
				
				target = newFile
			}
			else {
				// Cannot navigate
				console.warn('Could not navigate to', navigationData)
				return
			}
		}

		const viewState = this.viewState

		// TODO: defer to the current tangent, once there *is* a current tangent
		tangent = tangent ?? viewState.tangent
		if (origin === 'current') {
			origin = tangent.currentNode.value
		}

		if (target === origin) {
			// cast as TreeNode so that typescript knows the value is not 'current' anymore
			origin = null as TreeNode
		}

		const targetNode = getNode(target, this.directoryStore)

		// Check that the target can be represented
		if (!tangent.context.getState(targetNode, true, false)) {
			console.warn('Cannot generate a view state for ', targetNode, 'Opening locally')
			this.api.file.openPath(targetNode.path)
			return
		}

		direction = direction ?? 'out'
		if (direction === 'replace' && origin) {
			// Replacement operate on lens views rather than raw threads
			const thread = tangent.threadLenses.value
			const sourceIndex = thread.findIndex(lens => {
				return lens.currentlyRepresenting === origin ||
					lens.parent.node === origin
			})
			if (sourceIndex !== undefined) {
				const from = thread[sourceIndex - 1]
				const to = thread[sourceIndex + 1]

				tangent.updateThread({
					from: from?.parent.node,
					currentNode: targetNode,
					to: to?.parent.node
				})

				if (!from && !to) {
					const session = tangent.activeSession.value
					if (session) {
						session.map.connect({
							from: origin,
							to: targetNode,
							strength: MapStrength.Navigated
						})
					}
				}
			}
		}
		else {
			tangent.updateThread({
				currentNode: targetNode,
				from: direction === 'out' ? origin : null,
				to: direction === 'in' ? origin : null
			})
		}

		if (tangent.focusLevel.value === FocusLevel.Map) {
			this.commands.setThreadFocusLevel.execute({})
		}
		if (!viewState.directoryView.selection.includes(targetNode)) {
			viewState.directoryView.selection.set([targetNode])
		}

		const nodeState = tangent.context.getState(target)
		if (nodeState instanceof NoteViewState) {
			if (isReference(target) && target.annotations) {
				nodeState.setAnnotations(target.annotations)
			}
			if (link) {
				nodeState.highlightLink(link)
			}
		}
	}

	showContextMenu(template: SplitContextMenuTemplate | ContextMenuConstructorOptions[]) {
		// Delay context menu processing so that selection from the click has propagated 
		wait().then(() => {
			const context = prepareContextMenuCommands(template)
			this.contextMenuCommands = context.commands
			
			const raw = extractRawTemplate(context)

			try {
				this.api.menus.showContextMenu(raw)
			} catch (e) {
				console.error('Could not show context menu', raw)
			}
		})
	}

	validateShortcut(shortcut: string, target: any) {
		const targetIsCommand = target instanceof WorkspaceCommand
		for (const key of Object.keys(this.commands)) {
			const command = this.commands[key]
			if (command === target) continue
			if (command.shortcuts && (!command.group || (targetIsCommand && target.group.startsWith(command.group)))) {
				for (const sc of command.shortcuts) {
					if (sc == shortcut) {
						return 'This shortcut is used by "' + command.getName() + '"'
					}
				}
			}
		}

		for (const rule of this.workspaceSettings.value.creationRules.value) {
			if (rule === target) continue
			if (rule.shortcut.value === shortcut) {
				return 'This shortcut is used by the creation rule "' + rule.name.value + '"'
			}
		}

		return null
	}

	shutdown() {
		for (const item of this.directoryStore.allContents()) {
			if (item instanceof File) {
				item.unloadFile()
			}
		}
	}
}
