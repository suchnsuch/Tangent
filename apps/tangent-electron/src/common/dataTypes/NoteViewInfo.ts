import { ObjectStore, SimplePatchableStore, WritableStore } from 'common/stores'
import { DirectoryStore, type TreeNode } from 'common/trees'
import type DataType from './DataType'
import type { EditorRange } from '@typewriter/document'

const noteViewInfoFileType = '.noteview'

export default class NoteViewInfo extends ObjectStore {

	readonly scrollY = new WritableStore(0)
	readonly selection = new SimplePatchableStore<EditorRange>(null)
	readonly collapsedLines = new SimplePatchableStore<number[]>(null)

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
