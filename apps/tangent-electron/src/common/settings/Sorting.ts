import { ObjectStore } from 'common/stores'
import type { DirectoryStore } from 'common/trees'
import type { SettingDefinition } from './Setting'
import Setting from './Setting'
import { derived, Readable } from 'svelte/store'
import { getNodeFromReference, isNode, TreeNodeOrReference } from 'common/nodeReferences'
import { numberedStringSort, NumberedStringSortCache } from 'common/sorting'

export type SortOrder = 'ascending' | 'descending'

export interface SortMode {
	key: string
	order: SortOrder
}

const sortKeys = [ 'name', 'created', 'modified' ]

export { sortKeys }

export function sortNodes(nodes: TreeNodeOrReference[], sort: SortMode, store?: DirectoryStore) {

	const numberedStringSortCache: NumberedStringSortCache = new Map();

	return nodes.sort((a, b) => {

		a = isNode(a) ? a : getNodeFromReference(a, store)
		b = isNode(b) ? b : getNodeFromReference(b, store)

		const aValue = a[sort.key]
		const bValue = b[sort.key]

		if (typeof aValue === 'string' && typeof bValue === 'string') {
			return numberedStringSort(aValue, bValue, numberedStringSortCache) * (sort.order === 'ascending' ? 1 : -1)
		}

		if (aValue === bValue) return 0

		if (aValue === undefined) {
			return 1
		}
		if (bValue === undefined) {
			return -1
		}
		
		if (aValue < bValue) {
			return sort.order === 'ascending' ? -1 : 1
		}
		if (aValue > bValue) {
			return sort.order === 'descending' ? -1 : 1
		}
		return 0
	})
}

const sortKeyDefinition: SettingDefinition<string> = {
	name: 'Sort Key',
	description: 'Determines what value to sort by.',
	validValues: [
		{
			value: 'name',
			displayName: 'Name',
			description: 'Sorts by the name of the file.'
		},
		{
			value: 'created',
			displayName: 'Date Created',
			description: 'Sorts by the date the file was created.'
		},
		{
			value: 'modified',
			displayName: 'Date Modified',
			description: 'Sorts by the date the file was modified'
		}
	]
}

const sortOrderDefinition: SettingDefinition<SortOrder> = {
	name: 'Sort Order',
	description: 'Determines what order the value is sorted by.',
	validValues: [
		{
			value: 'ascending',
			displayName: 'Ascending',
			description: 'Sorts from first to last'
		},
		{
			value: 'descending',
			displayName: 'Descending',
			description: 'Sorts from last to first'
		}
	]
}

export class NodeSortStore extends ObjectStore {

	sortKey = new Setting(sortKeyDefinition)
	sortOrder = new Setting(sortOrderDefinition)

	sortMode: Readable<SortMode>

	constructor() {
		super()
		this.setupObservables()

		this.sortMode = derived([this.sortKey, this.sortOrder],
			([key, order]) => {
				return {
					key, order
				}
			})
	}
}
