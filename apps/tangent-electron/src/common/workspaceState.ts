import type { TreeNode } from 'common/trees'
import { ObjectStore, WritableStore } from 'common/stores'

export interface ClientInfo {
	/** The name of the computer + an identifying intenger per window */
	clientName: string
}

export interface WorkspaceInitState {
	client: ClientInfo
	/** The root of the workspace directory */
	files: TreeNode,
	/** The tags in the workspace */
	tags: TreeNode,
	/** The state common to all views into the workspace */
	state: any,
	/** The view/window specific state for the workspace */
	workspaceView: any,
	/** The global settings for the application */
	globalSettings: any,
	/** The app version */
	version: string
}

export class WorkspaceState extends ObjectStore {
	indexState: WritableStore<'unloaded'|'initialized'>

	constructor() {
		super()

		this.indexState = new WritableStore('unloaded')
	}
}
