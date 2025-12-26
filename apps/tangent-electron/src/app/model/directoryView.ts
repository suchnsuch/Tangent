import { ObjectStore, WritableStore } from 'common/stores'
import { DirectoryStore, iterateOverSortedChildren, TreePredicateResult, type TreeNode } from 'common/trees'
import { TreeItemListReference, TreeItemSetReference } from 'common/trees/treeReferences'
import { numberedStringSort } from 'common/sorting'
import { visibleFileTypeMatch } from 'common/fileExtensions'
import { queryFileType } from 'common/dataTypes/QueryInfo'

type SortOrder = 'ascending' | 'descending'

export interface SortMode {
	key: string
	order: SortOrder
}

const defaultSortMode: SortMode = { key: 'name', order: 'ascending' }

const sortKeys = [ 'name', 'created', 'modified' ]
export const sortModes: string[] = []

for (let key of sortKeys) {
	sortModes.push(encodeSortMode({
		key,
		order: 'ascending'
	}))

	sortModes.push(encodeSortMode({
		key,
		order: 'descending'
	}))
}

function encodeSortMode({ key, order }: SortMode): string {
	return `${key}|${order}`
}

export function decodeSortMode(value: string): SortMode {
	const match = value.match(/([^\|]+)\|(ascending|descending)/)
	if (match) {
		return {
			key: match[1],
			order: match[2] as SortOrder
		}
	}
	return null
}

function keyDisplayName(key: string) {
	switch (key) {
		case 'name':
			return 'Name'
		case 'created':
			return 'Date Created'
		case 'modified':
			return 'Date Edited'
	}
	return ''
}

function orderDisplayArrow(order: SortOrder) {
	switch (order) {
		case 'ascending':
			return '↑'
		case 'descending':
			return '↓'
	}
}

export function getSortModeDisplayName(sortMode: string, long = false) {
	const decoded = decodeSortMode(sortMode)
	if (decoded) {
		return `${keyDisplayName(decoded.key)} ${long ? decoded.order : orderDisplayArrow(decoded.order)}`
	}
	return ''
}

export default class DirectoryView extends ObjectStore {

	store: DirectoryStore
	root: TreeNode
	readonly openDirectories: TreeItemSetReference<TreeNode>
	readonly selection: TreeItemListReference<TreeNode>

	readonly sortMode: WritableStore<string>
	readonly sortFoldersToTop: WritableStore<boolean>
	readonly sortQueriesToTop: WritableStore<boolean>

	protected viewableFileExtensionMatch: RegExp

	constructor(directoryStore: DirectoryStore, root: TreeNode) {
		super()

		this.store = directoryStore
		this.root = root
		directoryStore.subscribe(store => this.onStoreChanged(store))

		this.openDirectories = new TreeItemSetReference(directoryStore)
		this.selection = new TreeItemListReference(directoryStore, [])

		this.sortMode = new WritableStore(encodeSortMode(defaultSortMode))
		this.sortFoldersToTop = new WritableStore(true)
		this.sortQueriesToTop = new WritableStore(true)

		this.viewableFileExtensionMatch = visibleFileTypeMatch
	}

	onStoreChanged(store) {
		this.store = store
		this.notifyChanged()
	}

	protected onValueChanged(key: string, newValue: any, oldValue: any): void {
		this.notifyChanged()
		super.onValueChanged(key, newValue, oldValue)
	}

	protected getTypeSorter(node: TreeNode) {
		if (node.fileType === 'folder' && this.sortFoldersToTop.value) {
			return 1
		}
		if (node.fileType === queryFileType && this.sortQueriesToTop.value) {
			return 2
		}
		return 10000 // Large value sorts last
	}

	get visibleItems(): Generator<TreeNode> {
		const sortMode = decodeSortMode(this.sortMode.value) || defaultSortMode
		const sortFoldersToTop = this.sortFoldersToTop.value

		const numberingSortCache = new Map<string, RegExpMatchArray>()

		return iterateOverSortedChildren(
			this.root,
			(a, b) => {

				const aTypeSorter = this.getTypeSorter(a)
				const bTypeSorter = this.getTypeSorter(b)

				const typeDiff = aTypeSorter - bTypeSorter;
				if (typeDiff != 0) return typeDiff

				let aValue = a[sortMode.key]
				let bValue = b[sortMode.key]

				if (typeof aValue === 'string' && typeof bValue === 'string') {
					return numberedStringSort(aValue, bValue, numberingSortCache) * (sortMode.order === 'ascending' ? 1 : -1)
				}

				// Need to check for `undefined` or sorting breaks
				if (aValue < bValue || bValue === undefined) {
					return sortMode.order === 'ascending' ? -1 : 1
				}
				else if (aValue > bValue || aValue === undefined) {
					return sortMode.order === 'descending' ? -1 : 1
				}
				return 0
			},
			item => {
				if (item.meta?.virtual) {
					return TreePredicateResult.Ignore
				}
				if (item.name.startsWith('.')) {
					return TreePredicateResult.Ignore
				}
				if (item.children) {
					return this.openDirectories.has(item) ?
						TreePredicateResult.Include :
						TreePredicateResult.IncludeWithoutChildren
				}
				if (item.fileType.match(this.viewableFileExtensionMatch)) {
					return TreePredicateResult.Include
				}
				return TreePredicateResult.Ignore
			}
		)
	}

	toggleOpen(item: TreeNode) {
		console.log('trying to toggle', item.name)
		if (item.children) {
			if (this.openDirectories.has(item)) {
				this.openDirectories.delete(item)
			}
			else {
				this.openDirectories.add(item)
			}
			this.notifyChanged()
		}
	}

	isItemOpen(item: TreeNode): boolean {
		return this.openDirectories.has(item)
	}
}
