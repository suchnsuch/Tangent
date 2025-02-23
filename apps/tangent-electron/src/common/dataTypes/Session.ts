import { ObjectStore, PatchableList, RawValueMode, ReadableStore, StoreUndoStack, WritableStore } from 'common/stores'
import { RESAVE_DATA_FILE, type DataTypeConstructionContext } from './DataType'
import { DirectoryLookup, DirectoryStore, TreeChange, TreeNode, nodeFromPath } from 'common/trees'
import { clamp } from 'common/utils'
import TangentMap from 'common/tangentMap/TangentMap'
import type DataType from './DataType'
import { MapStrength } from 'common/tangentMap/MapNode'

const extension = '.tangentsession'

export type ThreadHistoryItem = {
	thread: TreeNode[]
	currentNode: TreeNode
}

export const EmptyThreadHistoryItem: ThreadHistoryItem = {
	thread: [],
	currentNode: null
}

type ThreadHistoryPatchItem = {
	thread: string[]
	currentNode: string
}

export type UpdateThreadOptions = {
	currentNode?: TreeNode | number
	from?: TreeNode | 'retain'
	to?: TreeNode | 'retain'
	thread?: TreeNode[] | 'retain'
}

function threadHistoryItemsAreEqual(a: ThreadHistoryItem, b: ThreadHistoryItem) {
	if (!a && !b) return true
	if (!a && b || a && !b) return false

	if (a.currentNode !== b.currentNode) return false
	if (a.thread.length !== b.thread.length) return false
	
	for (let i = 0; i < a.thread.length; i++) {
		if (a.thread[i] !== b.thread[i]) return false
	}

	return true
}

/**
 * Validates & fixes up a thread history item
 * @returns True if the item was changed, false if the item was fine
 */
export function fixThreadHistoryItem(item: ThreadHistoryItem): boolean {
	let changed = false

	if (!item.thread) {
		changed = true
		item.thread = item.currentNode ? [item.currentNode] : []
	}

	for (let threadIndex = 0; threadIndex < item.thread.length; threadIndex++) {
		const threadItem = item.thread[threadIndex]
		if (threadItem) {
			// Make sure this is not a dupe
			for (let prevIndex = 0; prevIndex < threadIndex; prevIndex++) {
				// TODO: Identity other than path
				if (item.thread[prevIndex]?.path === threadItem?.path) {
					changed = true
					item.thread.splice(threadIndex, 1)
					threadIndex--
					break
				}
			}
		}
		else {
			// Nullish, remove it
			changed = true
			item.thread.splice(threadIndex, 1)
			threadIndex--
		}
	}

	if (item.thread.length && !item.currentNode) {
		changed = true
		item.currentNode = item.thread.at(-1) ?? null
	}

	if (item.currentNode === undefined) {
		changed = true
		item.currentNode = null
	}
	
	return changed
}

const threadHistoryLimit = 100
const doubleThreadHistoryLimit = threadHistoryLimit * 2

// Ideally this is implemented as a ring buffer…
export class ThreadHistoryList extends PatchableList<ThreadHistoryItem, ThreadHistoryPatchItem> {

	private directory: DirectoryLookup

	constructor(store: DirectoryLookup) {
		super()
		this.directory = store
	}

	protected convertFromPatchItem = (patchItem: ThreadHistoryPatchItem) => {
		return {
			thread: patchItem.thread.map(i => this.portablePathToNodeOrPlaceholder(i)),
			currentNode: this.portablePathToNodeOrPlaceholder(patchItem.currentNode)
		}
	}

	protected convertToPatchItem = (item: ThreadHistoryItem): ThreadHistoryPatchItem => {
		return {
			thread: item.thread.map(i => this.directory.pathToPortablePath(i?.path)),
			currentNode: this.directory.pathToPortablePath(item.currentNode?.path) ?? null
		}
	}

	private portablePathToNodeOrPlaceholder(portablePath: string): TreeNode {
		if (!portablePath) return null

		let path: string
		try {
			path = this.directory.portablePathToPath(portablePath)
		}
		catch (e) {
			console.error('Could not convert portable path', portablePath, e)
			return null
		}

		const realNode = this.directory.get(path)
		if (realNode) return realNode

		// Construct a placeholder for cases such as moved/deleted files
		const fakeNode = nodeFromPath(path)

		return fakeNode
	}

	validateItems() {
		let changed = false

		// Ensure that all items in the history have a thread and a current item
		const list = this.value
		for (let i = 0; i < list.length; i++) {
			const item = list[i]
			if (!item) {
				// Remove the empty item
				changed = true
				list.splice(i, 1)
				i--
				continue
			}

			changed = fixThreadHistoryItem(item) || changed
		}

		if (changed) {
			this.set([...list])
		}
	}
}

export function getSessionFilename(now?: Date) {
	now = now ?? new Date()

	return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}${extension}`
}

/**
 * The goal with sessions is to be non-distructive with history.
 * However, moves, deletions, etc, can't be tracked if the file isn't loaded.
 * This mechanism attempts to retain at least the record of the node being there
 * through raw `TreeNode` objects.
 */
class PlaceholderingDirectory implements DirectoryLookup {

	parent: DirectoryLookup

	placeholders = new Map<string, TreeNode>()
	createPlaceholders = true

	constructor(directory: DirectoryLookup) {
		this.parent = directory
	}

	get(path: string): TreeNode {
		const realNode = this.parent.get(path)
		if (realNode) return realNode

		const fakeNode = this.placeholders.get(path)
		if (fakeNode) return fakeNode

		if (this.createPlaceholders) {
			const newFakeNode = nodeFromPath(path)
			this.placeholders.set(path, newFakeNode)
			return newFakeNode
		}

		return null
	}

	getWithPortablePath(portablePath: string): TreeNode {
		try {
			return this.get(this.portablePathToPath(portablePath))
		}
		catch (e) {
			console.error('Could not convert portable path', portablePath, e)
			return null
		}
	}

	portablePathToPath(portablePath: string): string {
		return this.parent.portablePathToPath(portablePath)
	}

	pathToPortablePath(workspacePath: string): string {
		return this.parent.pathToPortablePath(workspacePath)
	}

	getParent(path: string | TreeNode): TreeNode {
		return this.parent.getParent(path)
	}

	isParentOf(maybeParent: TreeNode, maybeChild: TreeNode): boolean {
		return this.parent.isParentOf(maybeParent, maybeChild)
	}
}

// Increment this to create new session versions
const latestSessionVersion = 1

function migrateSession(context: DataTypeConstructionContext) {
	const { json } = context
	if (!json) return // Nothing there, nothing to migrate

	let version = json.version ?? 0

	if (version === 0) {
		// `previousSession` needs to be made portable
		if (json.previousSession && typeof json.previousSession === 'string') {
			try {
				const portablePath = context.store.pathToPortablePath(json.previousSession)
				if (portablePath) {
					console.log(context.file.name, 'changing previous session path from', json.previousSession, 'to', portablePath)
					json.previousSession = portablePath
				}
			}
			catch (e) {}
		}
		version++
	}
}

export default class Session extends ObjectStore {

	readonly _store: PlaceholderingDirectory
	readonly _file: TreeNode

	readonly threadHistory: ThreadHistoryList
	readonly threadIndex: WritableStore<number>

	// The portable path of the previous session
	readonly previousSession: WritableStore<string>

	readonly map: TangentMap

	readonly undoStack: StoreUndoStack
	
	private readonly _currentThreadItem: WritableStore<ThreadHistoryItem>
	private readonly  _isEmpty: WritableStore<boolean>
	private _isInitializing = false

	constructor(context: DataTypeConstructionContext) {
		super()

		const { store, json, file } = context

		const placeholderingStore = new PlaceholderingDirectory(store)
		this._store = placeholderingStore
		this._file = file

		this.undoStack = new StoreUndoStack(this)
		this.undoStack.registerUndoRedoCallback(() => this.publishCurrentThreadItem())

		this.threadHistory = new ThreadHistoryList(placeholderingStore)
		this.threadIndex = new WritableStore(-1)
		this.previousSession = new WritableStore('')

		this.map = new TangentMap(placeholderingStore)

		migrateSession(context)

		this._store.createPlaceholders = true
		this.applyPatch(json)
		this._store.createPlaceholders = false

		this._currentThreadItem = new WritableStore(null)
		this._isEmpty = new WritableStore(false)

		this.setupObservables()

		// Do one-time setup
		this.threadHistory.validateItems()
		this.map.connections.validateItems()
		const currentThreadIndex = this.threadIndex.value
		if (currentThreadIndex < 0 || currentThreadIndex >= this.threadHistory.length) {
			this.threadIndex.value = this.threadHistory.length - 1
		}

		this.publishCurrentThreadItem()

		this._isInitializing = true
		this.currentThread.subscribe(th => this.onThreadChanged(th))
		this._isInitializing = false
	}

	static isType(store: DirectoryStore, node: TreeNode) {
		return node.fileType === extension
	}

	getRawValues(mode?: RawValueMode) {
		const result: any = super.getRawValues(mode) ?? {}
		result.version = latestSessionVersion
		return result
	}

	get currentThread(): ReadableStore<ThreadHistoryItem> {
		return this._currentThreadItem
	}

	get isEmpty() {
		return this._isEmpty
	}

	private publishCurrentThreadItem() {
		this._currentThreadItem.set(this.threadHistory.get(this.threadIndex.value))
		this._isEmpty.set(this.map.nodes.size == 0)
	}

	private onThreadChanged(item: ThreadHistoryItem) {
		if (!item || this._isInitializing) return

		const map = this.map
		
		this.undoStack.withUndoGroup(() => {
			if (item.currentNode) {
				map.getOrCreate(item.currentNode, MapStrength.Navigated)
			}
	
			for (let i = 1; i < item.thread.length; i++) {
				const from = item.thread[i-1]
				const to = item.thread[i]
	
				map.connect({
					from, to,
					strength: MapStrength.Navigated,
					preventRecursiveLinks: true
				})
			}
		})
	}

	onTreeChange(change: TreeChange) {

		if (change.replaced) {
			for (let item of change.replaced) {
				this.map.notifyNodeReplaced(item.newPath, item.oldPath)
			}

			this.undoStack.clear()
		}

		if (change.removed) {
			// Removed nodes need to be removed
			// TODO: Or perhaps replaced by placeholders? Maybe only if the session is closed?

			let updateHistory = false
			let { thread, currentNode } = this.currentThread.value

			// Clean the thread of removed nodes
			const currentIndex = thread.indexOf(currentNode)
			const newThread = thread.filter(node => {
				for (const removed of change.removed) {
					// Removal of parents implies removal of children
					if (node.path.startsWith(removed)) {
						return false
					}
				}
				return true
			})
			if (newThread.length != thread.length) {
				thread = newThread
				updateHistory = true
			}

			const keysToRemove: TreeNode[] = []
			for (const key of this.map.nodes.keys()) {
				for (const removed of change.removed) {
					// Removal of parents implies removal of children
					if (key.path.startsWith(removed)) {
						keysToRemove.push(key)
					}
				}
			}

			for (const key of keysToRemove) {
				const node = this.map.get(key)
				if (node) {
					this.map.delete(node)
				}
			}

			if (currentNode && !thread.includes(currentNode)) {
				if (currentIndex >= 0 && thread.length) {
					currentNode = thread[clamp(currentIndex, 0, thread.length - 1)]
				}
				else {
					currentNode = null
				}
				updateHistory = true
			}

			if (updateHistory) {
				this.addThreadHistory({ thread, currentNode })
			}

			this.undoStack.clear()
		}

		if (change.added) {
			// Added nodes need to clean out existing placeholder values.

			let mustClearUndoStack = false

			for (let item of change.added) {
				const placeholder = this._store.placeholders.get(item.path)
				if (placeholder) {
					const newRealNode = this._store.get(item.path)
					console.log('Replacing a placeholder', placeholder, 'with', newRealNode)
					mustClearUndoStack = true

					this._store.placeholders.delete(item.path)

					// Swap out the placeholder in the thread history
					for (const threadItem of this.threadHistory) {
						if (threadItem.currentNode === placeholder) {
							threadItem.currentNode = newRealNode
						}

						for (let i = 0; i < threadItem.thread.length; i++) {
							if (threadItem.thread[i] === placeholder) {
								threadItem.thread[i] = newRealNode
							}
						}
					}

					// Swap out the placeholder in the map nodes
					const mapNode = this.map.nodes.get(placeholder)
					if (mapNode) {
						this.map.nodes.delete(placeholder)

						const newNode = this._store.get(placeholder.path)
						if (newNode) {
							mapNode.node.set(newNode)
							this.map.nodes.set(newNode, mapNode)
						}
					}

				}
			}

			if (mustClearUndoStack) {
				this.undoStack.clear()
				this._currentThreadItem.value = null
				this.publishCurrentThreadItem()
			}
		}

		if (change.moved) {
			for (let item of change.moved) {
				if (this.map.get(item.node.path)) {
					// Resave the file so that the moved item's new path is correctly reserialized
					this.sendPatch(RESAVE_DATA_FILE, null)
					this.undoStack.clear()
					break
				}
			}
		}
	}

	willItemChangeState(item: ThreadHistoryItem) {
		if (!item) {
			console.warn('Attempted to add a falsey thread history item')
			return false
		}

		if (fixThreadHistoryItem(item)) {
			console.warn('Fixed thread history item', item)
		}

		return !threadHistoryItemsAreEqual(item, this._currentThreadItem.value)
	}

	addThreadHistory(item: ThreadHistoryItem, reset=false) {

		if (!this.willItemChangeState(item)) {
			// No need to insert duplicate history
			return
		}
		
		const index = reset ? 0 : this.threadIndex.value + 1
		
		this.undoStack.withUndoGroup(() => {
			if (!reset && this.threadHistory.length > doubleThreadHistoryLimit) {
				// Truncate the list!
				console.log('Truncating thread history from', this.threadHistory.length, 'to', threadHistoryLimit)
				const newList: ThreadHistoryItem[] = []
				for (let i = this.threadHistory.length - threadHistoryLimit; i < this.threadHistory.length; i++) {
					newList.push(this.threadHistory.get(i))
				}
				newList.push(item)
				
				this.threadHistory.set(newList)
				this.threadIndex.set(newList.length - 1)
			}
			else {
				this.threadHistory.splice(index, this.threadHistory.length - index, item)
				this.threadIndex.set(index)
			}

			this.publishCurrentThreadItem()
		})
	}

	shiftHistory(step: number) {
		this.threadIndex.set(clamp(this.threadIndex.value + step, 0, this.threadHistory.length - 1))
		this.publishCurrentThreadItem()
	}

	setHistory(item: ThreadHistoryItem) {
		const index = this.threadHistory.indexOf(item)
		if (index >= 0) {
			this.undoStack.withUndoGroup(() => {
				this.threadIndex.set(index)
				this.publishCurrentThreadItem()
			})
		}
	}

	optionsToThreadItem(options: UpdateThreadOptions): ThreadHistoryItem {
		const { thread, currentNode } = this.currentThread.value ?? EmptyThreadHistoryItem

		let nextThread: TreeNode[] = null
		if (options.thread === 'retain') {
			nextThread = thread
			// Only retain if the current node is in the thread, otherwise reset
			if (typeof options.currentNode !== 'number') {
				if (nextThread.indexOf(options.currentNode) < 0) {
					nextThread = [options.currentNode]
				}
			}
		}
		else if (options.thread) {
			nextThread = options.thread
		}
		else if (typeof options.currentNode === 'number') {
			throw new Error('The current node cannot be a number without a specified thread.')
		}
		else {
			const { from, to } = options
			if (!options.currentNode) {
				throw new Error('Usage of `from` or `to` requires `currentNode` to be defined.')
			}
			const currentNodeIndex = thread.indexOf(options.currentNode)

			const fromThreadIndex = from === 'retain' ? currentNodeIndex - 1 : thread.indexOf(from)
			const fromNode = from === 'retain' ? thread[fromThreadIndex] : from
			const toThreadIndex = to === 'retain' ? currentNodeIndex + 1 : thread.indexOf(to)
			const toNode = to === 'retain' ? thread[to] : to

			const shouldRebuildThread = currentNodeIndex < 0 ||
			(
				(fromThreadIndex < 0 || currentNodeIndex > fromThreadIndex) &&
				(toThreadIndex < 0 || currentNodeIndex < toThreadIndex)
			)

			if (shouldRebuildThread) {
				const preList = fromThreadIndex >= 0 ? thread.slice(0, fromThreadIndex + 1)
					: (fromNode ? [fromNode] : [])
				const postList = toThreadIndex >= 0 ? thread.slice(toThreadIndex)
					: (toNode ? [toNode] : [])

				nextThread = [...preList, options.currentNode, ...postList]
			}
			else {
				nextThread = thread
			}
		}

		const nextCurrentNodeIndex = typeof options.currentNode === 'number'
			? options.currentNode
			: nextThread.indexOf(options.currentNode)

		const nextCurrentNode = nextCurrentNodeIndex >= 0
			? nextThread[nextCurrentNodeIndex]
			: nextThread.at(-1) ?? null

		return {
			thread: nextThread,
			currentNode: nextCurrentNode
		}
	}

	/**
	 * Updates the thread given the passed options.
	 * You should ideally go through the Tangent implementation,
	 * which can create new sessions and implements better call safety.
	 */
	updateThread(options: UpdateThreadOptions) {
		this.addThreadHistory(this.optionsToThreadItem(options))
	}

	getDateRange(): { first?: Date, last?: Date } {
		let first: Date = null
		let last: Date = null
			
		for (const node of this.map.nodes.values()) {
			if (!first || first.getTime() > node.dateCreated.getTime()) {
				first = node.dateCreated
			}
			if (!last || last.getTime() < node.dateCreated.getTime()) {
				last = node.dateCreated
			}
		}

		for (const connection of this.map.connections) {
			if (!first || first.getTime() > connection.dateCreated.getTime()) {
				first = connection.dateCreated
			}
			if (!last || last.getTime() < connection.dateCreated.getTime()) {
				last = connection.dateCreated
			}
		}

		return { first, last }
	}

	// Integrates the data from the given session into this session
	mergeWith(other: Session) {
		// Elements are integrated individually to account for non-thread-based
		// manipulation of the ma
		const map = this.map
		const otherMap = other.map

		for (const [treeNode, mapNode] of otherMap.nodes) {
			map.nodes.getOrCreate(treeNode, {
				dateCreated: mapNode.dateCreated,
				isRoot: mapNode.isRoot.value,
				strength: mapNode.strength.value
			})
		}

		for (const connection of otherMap.connections) {
			map.connect({
				from: connection.fromTreeNode,
				to: connection.toTreeNode,
				strength: connection.strength.value,
				date: connection.dateCreated,
				preventRecursiveLinks: false
			})
		}

		this.threadHistory.add(other.threadHistory.value)
		this.threadIndex.set(this.threadHistory.length - 1)
		
		this.undoStack.clear()

		this.publishCurrentThreadItem()
	}
}

Session satisfies DataType
