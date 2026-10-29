import type DataType from 'common/dataTypes/DataType'
import type { TreeNode } from 'common/trees'
import type { ObjectStore } from 'common/stores'
import { File, Workspace } from '.'

export default class DataFile extends File {
	private _data?: ObjectStore
	dataType: DataType

	waitingPromise?: Promise<any> 
	waitingPromiseResolver?: (data) => void
	patchUnobserver: () => void

	constructor(dataType: DataType, node: TreeNode, workspace: Workspace) {
		super(node, workspace)

		this.dataType = dataType
	}

	get data() { return this._data }

	/**
	 * Get a typed promise based on the loaded file.
	 * Calling this increments file usage. Be sure to call dropFile() when done.
	 */
	async loadData<T extends ObjectStore>(): Promise<T> {

		// Always want to call load file so that usage count is incremented
		this.loadFile()

		if (this._data) return this._data as T

		if (!this.waitingPromise) {
			this.waitingPromise = new Promise((resolve, reject) => {
				this.waitingPromiseResolver = resolve
			})
		}

		return this.waitingPromise
	}

	saveFile() {
		return // This does nothing on purpose
	}

	getFileContent() {
		return // This does nothing on purpose
	}

	onFileContentChanged(content: unknown) {
		if (!this._data) {
			this.setData(new this.dataType({
				store: this.workspace.directoryStore,
				file: this,
				json: content
			}))
		}
		else {
			this._data.applyPatch(content)
		}

		if (this._data && this.waitingPromiseResolver) {
			this.waitingPromiseResolver(this._data)
			this.waitingPromise = null
			this.waitingPromiseResolver = null
		}
	}

	private setData(data: ObjectStore) {
		if (this._data !== data) {
			if (this.patchUnobserver) {
				this.patchUnobserver()
				this.patchUnobserver = null
			}

			this._data = data

			if (data) {
				this.patchUnobserver = data.observePatch(patch => {
					this.api.updateFile(this.path, patch)
				})
			}
		}
	}

	onUnloaded() {
		this.setData(null)
	}
}
