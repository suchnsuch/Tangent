import type { TreeNode } from 'common/trees'
import type Workspace from "./Workspace";

import { WritableStore, ObjectStore } from 'common/stores'
import SidebarState from "common/SidebarState";
import DirectoryView from "./directoryView";
import Tangent from "./Tangent";
import ModalState from "./ModalState";
import SystemMenu from './SystemMenu';
import { FocusLevel } from 'common/dataTypes/TangentInfo';

export default class WorkspaceViewState extends ObjectStore {
	
	workspace: Workspace

	directoryView: DirectoryView
	tagTreeView: DirectoryView
	leftSidebar: SidebarState

	tangent: Tangent

	targetFocusModeLevel: WritableStore<FocusLevel>

	modal: ModalState

	system = new SystemMenu()

	_initializing: boolean = false

	constructor(workspace: Workspace) {
		super()
		this.workspace = workspace

		this.directoryView = new DirectoryView(
			workspace.directoryStore,
			workspace.directoryStore.files)

		this.tagTreeView = new DirectoryView(
			workspace.directoryStore,
			workspace.directoryStore.tags)
		
		this.leftSidebar = new SidebarState()
		
		this.tangent = new Tangent(this, workspace.client.clientName)

		this.targetFocusModeLevel = new WritableStore(FocusLevel.Typewriter)
		
		this.modal = new ModalState()
	}

	initializeWithState(state: any) {
		this._initializing = true

		// This needs to occur later so that dependencies are available
		this.applyPatch(state)

		// Push state back to main now that it's been sanitized
		const fullPatch = this.getRawValues()
		this.workspace.api.setWorkspaceViewState(fullPatch)

		// Set up reactivity
		this.tangent.currentNode.subscribe(currentNode => this.onCurrentNodeChanged(currentNode))
		
		// Set up interconnect with main
		this.workspace.api.onWorkspaceViewPatch(patch => {
			try {
				this.applyPatch(patch)
			}
			catch (e) {
				console.error('View State Apply Patch handler failed')
				console.log(e)
			}
		})

		this.modal.currentComponent.subscribe(c => {
			if (c && this.system.showMenu.value) {
				this.system.showMenu.set(false)
			}
		})

		this.setupObservables()
		this.observePatch(patch => {
			try {
				this.workspace.api.sendWorkspaceViewPatch(patch)
			}
			catch (err) {
				console.error('Could not send', patch)
				console.error(err)
			}
		})

		this._initializing = false
	}

	async startup() {
		await this.tangent.startup()
	}

	onCurrentNodeChanged(currentNode: TreeNode) {
		if (this._initializing) return

		if (currentNode) {
			if (!this.directoryView.selection.includes(currentNode)) {
				this.directoryView.selection.set([currentNode])
			}
			if (!this.tagTreeView.selection.includes(currentNode)) {
				this.tagTreeView.selection.set([currentNode])
			}
		}
	}
}