import type { TreeNode, DirectoryStore } from 'common/trees'
import type DataType from './DataType'
import SetInfo from './SetInfo'

export default class FolderInfo extends SetInfo {

	constructor({ json }) {
		super()

		this.applyPatch(json)
		this.setupObservables()
	}

	static isType(store: DirectoryStore, node: TreeNode): boolean {
		return node.name === '.tangentfolder'
	}
}

FolderInfo satisfies DataType
