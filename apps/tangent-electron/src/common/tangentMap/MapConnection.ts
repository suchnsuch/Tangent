import { swapRemove } from '@such-n-such/core'
import { coerceToDate } from 'common/dates'
import { ObjectStore, RawValueMode, PatchableList, PatchableListPatchType } from 'common/stores'
import type MapNode from './MapNode'
import { MapStrength, MapStrengthStore } from './MapNode'
import { MapNodeReference, MapNodeStore } from './MapNodeStore'
import Logger from 'js-logger'

let errorID = 0

const log = Logger.get('TangentMap')

export default class MapConnection extends ObjectStore {
	from: MapNodeReference
	to: MapNodeReference
	dateCreated: Date
	strength: MapStrengthStore

	constructor(store: MapNodeStore, from: MapNode, to: MapNode, strength?: MapStrength, date?: Date) {
		super()
		this.from = new MapNodeReference(store, from)
		this.to = new MapNodeReference(store, to)
		this.dateCreated = date ?? new Date()
		this.strength = new MapStrengthStore(strength ?? MapStrength.None)

		this.setupObservables()
	}

	applyPatch(patch: any, sendPatch?: boolean) {
		const result = super.applyPatch(patch, sendPatch)
		this.dateCreated = coerceToDate(patch.dateCreated, this.dateCreated)
		return result
	}
	
	getRawValues(mode?: RawValueMode) {
		const values = super.getRawValues(mode)
		values.dateCreated = this.dateCreated
		return values
	}

	get id() {
		const fromPath = this.from.value?.node.value?.path
		const toPath = this.to.value?.node.value?.path

		if (!fromPath || !toPath) {
			console.error('Invalid nodes for connection key: ', this)
			errorID++
			return 'InvalidConnectionKey' + errorID
		}

		return fromPath + toPath
	}

	get fromTreeNode() { return this.from.value.node.value }
	get toTreeNode() { return this.to.value.node.value }
}

export class MapConnectionList extends PatchableList<MapConnection, any> {
	store: MapNodeStore

	constructor(store: MapNodeStore) {
		super([], { patchItems: true })
		this.store = store

		this.observeAdditionsAndDeletions((added, deleted) => {
			if (deleted) {
				try {
					for (const deletedItem of deleted) {
						swapRemove(deletedItem.from.value.outgoing, deletedItem)
						swapRemove(deletedItem.to.value.incoming, deletedItem)
					}	
				}
				catch (e) {
					log.error('Could not handle deletion of ', deleted)
					throw new Error('Could not handle deletion of deleted items', { cause: e})
				}
			}
			if (added) {
				for (const addedItem of added) {
					addedItem.from.value.outgoing.push(addedItem)
					addedItem.to.value.incoming.push(addedItem)
				}
			}
		})
	}

	validateItems() {
		// Validates that there are no duplicate connections
		// Does this strangely so that a valid list is a no-op synchronization-wise

		const usedKeys = new Set<string>()
		const itemsToRemove = new Set<MapConnection>()
		for (const connection of this.value) {
			const key = connection.id
			if (usedKeys.has(key)) {
				itemsToRemove.add(connection)
			}
			else {
				usedKeys.add(key)
			}
		}

		if (itemsToRemove.size > 0) {
			const validItems = this.value.filter(c => !itemsToRemove.has(c))
			this.set(validItems)
		}
	}

	protected convertFromPatchItem(patch: any) {
		if (!patch.to || !patch.from) {
			log.warn('Map connection list received an invalid path item:', patch)
			return null
		}
		const connection = new MapConnection(this.store, null, null)
		connection.applyPatch(patch)
		if (!connection.from.value || !connection.to.value || connection.from.value === connection.to.value) {
			if (!connection.from.value) {
				log.warn('Map connection list could not resolve "' + patch.from + '" to a valid map node.')
			}
			if (!connection.to.value) {
				log.warn('Map connection list could not resolve "' + patch.to + '" to a valid map node.')
			}
			else if (connection.from.value === connection.to.value) {
				log.warn('Map connection list received a connection pointing a map node back onto itself:', patch)
			}
			connection.dispose()
			return null
		}
		
		return connection
	}

	protected convertToPatchItem(connection: MapConnection) {
		return connection.getRawValues()
	}

	findConnection(from: MapNode, to: MapNode) {
		return this.value.find(c => c.from.value === from && c.to.value === to)
	}

	findConnectionIndex(from: MapNode, to: MapNode) {
		return this.value.findIndex(c => c.from.value === from && c.to.value === to)
	}
}
