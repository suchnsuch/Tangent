import { WritableStore, StoreUndoStack, CachingStore, ReadableStore, ForwardingStore } from 'common/stores'
import type WorkspaceViewState from "./WorkspaceViewState"

import type { TreeChange, TreeNode } from 'common/trees'
import type TangentMap from 'common/tangentMap/TangentMap'
import ViewStateContext from './nodeViewStates/ViewStateContext'
import { FolderViewState, ImageViewState, NoteViewState, type NodeViewState } from './nodeViewStates'
import { derived } from 'svelte/store'
import type LensViewState from './nodeViewStates/LensViewState'
import DataFile from './DataFile'
import type Session from 'common/dataTypes/Session'
import TangentInfo, { FocusLevel, filename } from 'common/dataTypes/TangentInfo'
import paths from 'common/paths'
import { UpdateThreadOptions, getSessionFilename } from 'common/dataTypes/Session'
import NoteFile from './NoteFile'
import { NoteDetailMode } from './nodeViewStates/NoteViewState'
import Folder from './Folder'
import Tag from './Tag'
import TagViewState from './nodeViewStates/TagViewState'
import EmbedFile from './EmbedFile'
import { EmbedType } from 'common/embedding'
import QueryInfo from 'common/dataTypes/QueryInfo'
import QueryViewState from './nodeViewStates/QueryViewState'

export default class Tangent {
	_state: WorkspaceViewState

	tangentName: string
	tangentInfoFile: DataFile
	tangentInfo = new WritableStore<TangentInfo>(null)
	tangentUnsubs: (() => void)[] = []

	openSessions = new WritableStore<Session[]>([])
	activeSession = new WritableStore<Session>(null)

	focusLevel = new ForwardingStore<FocusLevel>(FocusLevel.Thread)

	map: ReadableStore<TangentMap>
	context: ViewStateContext

	thread: ReadableStore<TreeNode[]>
	currentNode: ReadableStore<TreeNode>

	threadLenses: CachingStore<LensViewState[]>
	currentThreadState: CachingStore<NodeViewState>

	constructor(state: WorkspaceViewState, tangentName: string) {
		this._state = state
		this.tangentName = tangentName

		this.thread = new CachingStore(derived(this.activeSession, (session, set) => {
			if (session) {
				return session.currentThread.subscribe(th => set(th?.thread ?? []))
			}
			set([])
		}), (o, n) => this.onThreadChanged(o, n))

		this.currentNode = new CachingStore(derived(this.activeSession, (session, set) => {
			return session?.currentThread.subscribe(th => set(th?.currentNode))
		}))

		this.map = new CachingStore(derived(this.activeSession, (session) => {
			return session?.map
		}))

		this.threadLenses = new CachingStore(derived(this.thread, (thread, set) => {
			return derived(thread.map(t => this.context.getState(t)?.currentLens), lenses => {
				const result: LensViewState[] = []
				let hasRepresented = false
				for (const lens of lenses) {
					if (lens === null) break
					if (result.length !== 0) {
						const last = result[result.length - 1]
						if (!hasRepresented && last.willRepresent && last.willRepresent(lens.parent.node)) {
							// Don't push that one, and don't allow double representation
							hasRepresented = true
							continue
						}
					}
					result.push(lens)
					hasRepresented = false
				}
				return result
			}).subscribe(set)
		}))

		this.currentThreadState = new CachingStore(derived(
			[this.threadLenses, this.currentNode],
			([lenses, currentNode]) => {
				for (const lens of lenses) {
					if (lens?.parent.node === currentNode || lens?.currentlyRepresenting === currentNode) {
						return lens.parent
					}
				}
			})
		)

		this.context = new ViewStateContext(state.workspace, this)
		this.context.creators = [
			(context, node, reference) => {
				if (node instanceof NoteFile) {
					const noteViewState = new NoteViewState(context, node, NoteDetailMode.All)
					if (reference?.annotations) {
						noteViewState.setAnnotations(reference.annotations)
					}
					return noteViewState
				}

				if (node instanceof Folder) {
					return new FolderViewState(context, node)
				}
		
				if (node instanceof Tag) {
					return new TagViewState(context, node)
				}
		
				if (node instanceof EmbedFile) {
					switch (node.embedType) {
						case EmbedType.Image:
							return new ImageViewState(node)
					}
				}
		
				if (node instanceof DataFile) {
					if (QueryInfo.isType(null, node)) {
						return new QueryViewState(context, node)
					}
				}
			}
		]
	}

	async startup() {
		const workspace = this._state.workspace

		if (!this.tangentName) {
			console.error('No tangent name set!')
			return
		}

		const relativeTangentDir = `.tangent/tangents/${this.tangentName}`
		
		this.tangentInfoFile = workspace.commands.createNewFile.execute({
			relativePath: paths.join(relativeTangentDir, filename),
			creationMode: 'createOrOpen',
			updateSelection: false
		}) as DataFile

		const tangentInfo = await this.tangentInfoFile.loadData<TangentInfo>()

		this.tangentInfo.set(tangentInfo)

		this.focusLevel.forwardFrom(tangentInfo.focusLevel)

		let startupTasks: Promise<void>[] = []

		this.tangentUnsubs.push(tangentInfo.activeSession.subscribe((file, oldFile) => {
			if (oldFile) {
				(oldFile as DataFile).dropFile()
			}
			if (file) {
				startupTasks.push((file as DataFile).loadData<Session>()
					.then(session => {
						this.activeSession.set(session)
					})
					.catch(e => console.error('Session loading failed', e))
				)
			}
			else {
				this.activeSession.set(null)
			}
		}))

		this.tangentUnsubs.push(tangentInfo.openSessions.subscribe((files, oldFiles) => {
			if (oldFiles) {
				oldFiles.forEach(f => (f as DataFile).dropFile())
			}
			if (files) {
				startupTasks.push(
					Promise.all(files.map(f => (f as DataFile).loadData<Session>()))
						.then(sessions => this.openSessions.set(sessions))
						.catch(e => console.error('Session loading failed', e))
				)
			}
			else {
				this.openSessions.set([])
			}
		}))

		if (!tangentInfo.activeSession.value) {
			// Create a new session
			const newSessionFile = this.createSession()

			tangentInfo.openSessions.add(newSessionFile)
			tangentInfo.activeSession.set(newSessionFile)
		}
		else if (tangentInfo.openSessions.length === 0) {
			// Make sure the active session is in the open sessions list
			tangentInfo.openSessions.add(tangentInfo.activeSession.value)
		}

		if (startupTasks.length == 0) {
			console.error('Tangent did not initialize session startup correctly!')
		}
		
		return Promise.all(startupTasks)
	}

	createSession(followUp: (session: Session) => void = null) {
		const sessionFilename = getSessionFilename()
		console.log('Creating new session: ', sessionFilename)
		const relativeTangentDir = `.tangent/tangents/${this.tangentName}`
		const newSessionFile = this._state.workspace.commands.createNewFile.execute({
			relativePath: paths.join(relativeTangentDir, 'sessions', sessionFilename),
			creationMode: 'createOrOpen',
			updateSelection: false
		}) as DataFile

		if (followUp) {
			newSessionFile.loadData<Session>().then(session => {
				followUp(session)
				newSessionFile.dropFile()
			})
		}

		return newSessionFile
	}

	/**
	 * Updates the current node and modifies the thread so that from and to match.
	 * @param options.currentNode The new current node of the thread.
	 * @param opts.from The node the new current node will connect from (if any).
	 * @param options.to The node the new current node will connect to (if any).
	 */
	updateThread(opts: { from?: TreeNode, currentNode: TreeNode, to?: TreeNode })
	/**
	 * Updates the current thread and sets a new current node.
	 * @param opts.thread The new thread of nodes to set. Pass 'retain' to use the current thread.
	 * @param opts.currentNode The new node, or the index of the new node in the given thread.
	 * 		If not supplied, the current node is the same as the old current node if in the new thread
	 * 		or is the last node in the thread.
	 */
	updateThread(opts: { thread: TreeNode[] | 'retain', currentNode?: TreeNode | number })
	updateThread(options: UpdateThreadOptions)
	updateThread(options: UpdateThreadOptions) {
		const session = this.activeSession.value
		if (session) {

			const nextHistoryItem = session.optionsToThreadItem(options)
			if (session === this.activeSession.value && !session.willItemChangeState(nextHistoryItem)) {
				// No need to push state or create a new session
				return
			}

			const now = new Date()
			const { last } = session.getDateRange()
			
			// `last` can be null if there is no content!
			const diff = now.getTime() - (last ?? now).getTime()

			if (diff >= 1000 * 60 * 60 * 8) { // 8 hours later

				const tangentInfo = this.tangentInfo.value
				const previousSessionPath = tangentInfo.activeSession.value?.path ?? ''

				if (options.thread === 'retain' &&
					typeof options.currentNode !== 'number' &&
					this.thread.value.includes(options.currentNode)) {
					// Since the request was to retain the thread, we pull in the current thread.
					// The new session won't have that thread, and we need to maintain continuity.
					options.thread = this.thread.value
				}

				const newSessionFile = this.createSession(newSession => {
					newSession.previousSession.set(previousSessionPath)
					newSession.updateThread(options)
				})
				
				tangentInfo.openSessions.addUnique(newSessionFile)
				tangentInfo.activeSession.set(newSessionFile)
			}
			else {
				// Use the previously computed history item
				session.addThreadHistory(nextHistoryItem)
			}
		}
		else {
			console.error('Cannot set current node without an active session!')
		}
	}

	onTreeChange(change: TreeChange) {
		// No need to update the active session; it should be in the "open sessions" list.
		for (const session of this.openSessions.value) {
			session.onTreeChange(change)
		}

		this.context.onTreeChange(change)
	}

	onThreadChanged(oldValue: TreeNode[], value: TreeNode[]) {
		const oldValues = oldValue?.filter(n => !value?.includes(n)) || []
		const newValues = value?.filter(n => !oldValue?.includes(n)) || []

		for (const node of oldValues) {
			this.context.dropState(node)
		}

		for (const node of newValues) {
			const viewState = this.context.getState(node, true)
			if (!viewState) {
				console.error('Did not create view state for:', node)
			}
		}
	}
}