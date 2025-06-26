import { ObjectStore, WritableStore } from 'common/stores'
import { DirectoryStore, TreeNode } from 'common/trees'
import type DataType from './DataType'
import type { EditorRange } from '@typewriter/document'

const noteViewInfoFileType = '.noteview'

export default class NoteViewInfo extends ObjectStore {

	readonly scrollY = new WritableStore(0)
	readonly selection = new WritableStore<EditorRange>(null)

	constructor({ json }) {
		super()

		this.applyPatch(json)
		this.setupObservables()
	}

	static isType(store: DirectoryStore, node: TreeNode): boolean {
		return node.fileType === noteViewInfoFileType
	}

	static get fileType() { return noteViewInfoFileType }
}

NoteViewInfo satisfies DataType
