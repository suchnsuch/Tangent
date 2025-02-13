import type FeedLensSettings from 'common/settings/FeedLensSettings'
import { sortNodes } from 'common/settings/Sorting'
import { WritableStore } from 'common/stores'
import { derived, get, Readable } from 'svelte/store'
import type { SetLensViewState } from './LensViewState'
import type { SetViewState } from './SetViewState'

import FeedView from 'app/views/node-views/FeedView.svelte'
import FeedSettingsView from 'app/views/node-views/FeedSettingsView.svelte'
import type ViewStateContext from './ViewStateContext'
import { NoteViewState } from '.'
import { getNode, indexOfMatch, TreeNodeOrReference } from 'common/nodeReferences'
import { NoteDetailMode } from './NoteViewState'
import { areNodesOrReferencesEquivalent, getNode, indexOfMatch, TreeNodeOrReference } from 'common/nodeReferences'

export default class FeedViewState implements SetLensViewState {
	
	readonly parent: SetViewState
	readonly context: ViewStateContext
	readonly settings: FeedLensSettings

	readonly items: Readable<TreeNodeOrReference[]>

	readonly scrollY: WritableStore<number>
	readonly firstItem: WritableStore<TreeNodeOrReference>
	readonly lastItem: WritableStore<TreeNodeOrReference>
	readonly currentItem: WritableStore<TreeNodeOrReference>

	readonly unsubs = []

	currentlyRepresenting?: TreeNodeOrReference;

	constructor(parent: SetViewState, settings: FeedLensSettings) {
		this.parent = parent

		this.context = parent.context.createChild()
		this.context.customizeNewState = state => {
			if (state instanceof NoteViewState) {
				state.detailMode = NoteDetailMode.None
			}
		}

		this.settings = settings

		this.items = derived(
			[parent.nodes, settings.sorting.sortMode],
			([nodes, sortMode]) => {
				return sortNodes(nodes, sortMode, this.context.workspace.directoryStore)
			})

		this.scrollY = new WritableStore(-1)
		this.firstItem = new WritableStore(null)
		this.lastItem = new WritableStore(null)
		this.currentItem = new WritableStore(null)

		this.unsubs.push(
			this.settings.startAt.subscribe(startAt => {
				// Reset values for scrolling
				this.scrollY.set(-1)
				this.firstItem.set(null)
				this.lastItem.set(null)
				this.currentItem.set(null)
			}),
			this.parent.nodes.subscribe(n => {
				// Reset node states
				this.context.clearStates()
			}),
			this.currentItem.subscribe(n => this.applyCurrentItemToThread(n))
		)
	}

	get viewComponent() { return FeedView }
	get settingsComponent() { return FeedSettingsView }
	get documentationPage() { return "Feed Lens" }

	focus(element: HTMLElement): boolean {
		const currentContainer = element.querySelector('.feed > .current')

		const state = this.context.getState(this.currentItem.value)
		if (state?.focus) {
			return state.focus(currentContainer as HTMLElement)
		}
	}

	willRepresent(item: TreeNodeOrReference): boolean {
		const items = get(this.items)
		const index = indexOfMatch(items, item)
		if (index >= 0) {
			this.currentlyRepresenting = item
			// Set after currentlyRepresenting so that we don't create a duplicate thread item
			this.currentItem.set(item)
			const firstNode = this.firstItem.value
			const lastNode = this.lastItem.value
			if (!firstNode || indexOfMatch(items, firstNode) > index) this.firstItem.set(item)
			if (!lastNode || indexOfMatch(items, lastNode) < index) this.lastItem.set(item)
			return true
		}
		return false
	}

	applyCurrentItemToThread(item: TreeNodeOrReference) {
		if (!item) return
		if (areNodesOrReferencesEquivalent(item, this.currentlyRepresenting)) return

		const session = this.context.tangent.activeSession.value
		if (!session) return

		const itemNode = getNode(item, this.context.workspace.directoryStore)
		
		const threadItem = session.currentThread.value
		if (!threadItem) return
		const { thread, currentNode } = threadItem

		const oldIndex = thread.indexOf(this.parent.node)
		if (oldIndex < 0) return

		const existingIndex = thread.indexOf(itemNode)
		if (existingIndex != oldIndex + 1) {
			// We don't want to drop context
			session.addThreadHistory({
				thread: [
					...thread.slice(0, oldIndex + 1),
					itemNode,
					...thread.slice(oldIndex + 2)
				],
				currentNode: itemNode
			})
		}
	}

	dispose() {
		this.context.dispose()
		for (const unsub of this.unsubs) unsub()
	}
}
