import type { DirectoryStore, TreeNode } from 'common/trees'
import type DataType from './DataType'
import SetInfo from './SetInfo'

export default class TagInfo extends SetInfo {
	constructor({ json }) {
		super()

		this.applyPatch(json)
		this.setupObservables()
	}

	static isType(store: DirectoryStore, node: TreeNode): boolean {
		return node.fileType === '.taginfo'
	}
}

// To confirm the type
TagInfo satisfies DataType
