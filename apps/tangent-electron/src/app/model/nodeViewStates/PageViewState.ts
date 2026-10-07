import type { SetLensViewState } from './LensViewState'
import { type SetViewState } from './SetViewState'
import PageLensSettings from 'common/settings/PageLensSettings'
import PageView from 'app/views/node-views/PageView.svelte'
import PageSettingsView from 'app/views/node-views/PageSettingsView.svelte'
import { derived, type Readable } from 'svelte/store'
import NoteViewState from './NoteViewState'
import { CachingStore } from 'common/stores'
import NoteFile from '../NoteFile'
import paths from 'common/paths'
import type { Workspace } from '..'
import type { TreeNode } from 'common/trees'
import { getNode, type TreeNodeOrReference } from 'common/nodeReferences'

function resolveSubNote(workspace: Workspace, node: TreeNode, subpath: string) {
	const path = paths.resolve(paths.join(node.path, subpath))
	const found = workspace.directoryStore.get(path, true)
	if (found instanceof NoteFile) {
		return found
	}
}

export default class PageViewState implements SetLensViewState {
	readonly parent: SetViewState
	readonly settings: PageLensSettings

	readonly note: CachingStore<NoteFile>
	readonly noteViewState: CachingStore<NoteViewState>

	constructor(parent: SetViewState, settings: PageLensSettings) {
		this.parent = parent
		this.settings = settings

		this.note = new CachingStore(derived([
			this.parent.context.workspace.directoryStore,
			this.settings.pagePath
		], ([store, pagePath]) => {
			const workspace = this.parent.context.workspace
			const node = this.parent.node
			return (pagePath && resolveSubNote(workspace, node, pagePath))
				|| resolveSubNote(workspace, node, node.name + '.md')
				|| resolveSubNote(workspace, node, 'index.md')
				|| null
		}))

		this.noteViewState = new CachingStore(derived(this.note, (note) => {
			return note ? new NoteViewState(this.parent.context, note) : null
		}))
	}

	get viewComponent() { return PageView }
	get settingsComponent() { return PageSettingsView }

	focus(element: HTMLElement): boolean {
		if (this.noteViewState.value) {
			return this.noteViewState.value.focus(element)
		}
		const found = element?.querySelector('main article .buttons button')
		if (found instanceof HTMLElement) {
			found.focus()
			return true
		}
	}

	willRepresent(node: TreeNodeOrReference): boolean {
		return getNode(node, this.parent.context.workspace.directoryStore) === this.note.value
	}

	get currentlyRepresenting() {
		return this.note.value
	}

	get currentlyRepresentingView() {
		return this.noteViewState.value
	}
}
