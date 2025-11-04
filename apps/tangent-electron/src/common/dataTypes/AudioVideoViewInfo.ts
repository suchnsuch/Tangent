import { ObjectStore, WritableStore } from 'common/stores'
import DataType from './DataType'
import { DirectoryStore, TreeNode } from 'common/trees'

const fileType = '.avview'

export default class AudioVideoViewInfo extends ObjectStore {

	readonly playbackPosition = new WritableStore(0)

	constructor({ json }) {
		super()

		this.applyPatch(json)
		this.setupObservables()
	}

	static isType(store: DirectoryStore, node: TreeNode): boolean {
		return node.fileType === fileType
	}

	static get fileType() { return fileType }
}

AudioVideoViewInfo satisfies DataType
