import type { TreeNode, DirectoryStore } from 'common/trees'
import type { ObjectStore } from 'common/stores'

export type DataTypeConstructionContext = {
	store: DirectoryStore // The store the data file is a member of
	file: TreeNode // The node representing the data file
	json: any // The raw contents of the file
}

export default interface DataType {
	new (args: DataTypeConstructionContext): ObjectStore
	isType(store: DirectoryStore, node: TreeNode): boolean
	rawToPatch?(raw: string): any
	saveDelay?: number
}

// A magic word that triggers resaving a file without any changes
export const RESAVE_DATA_FILE = 'RESAVE'
