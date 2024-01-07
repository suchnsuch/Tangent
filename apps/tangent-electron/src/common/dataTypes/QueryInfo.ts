import type { TreeNode, DirectoryStore } from 'common/trees'
import { WritableStore } from 'common/stores'
import type DataType from './DataType'
import SetInfo from './SetInfo'

export const queryFileType = '.tangentquery'

export default class QueryInfo extends SetInfo {

	readonly queryString: WritableStore<string> = new WritableStore('')

	constructor({ json }) {
		super()

		this.resetQueryString()

		this.applyPatch(json)
		this.setupObservables()
	}

	resetQueryString() {
		this.queryString.value = 'Notes with \'\''
	}

	static isType(store: DirectoryStore, node: TreeNode): boolean {
		return node.fileType === queryFileType
	}
}

QueryInfo satisfies DataType
