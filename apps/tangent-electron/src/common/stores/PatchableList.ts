import { deepEqual } from 'fast-equals'

import { lazyInitializeSubscriptionList } from './EventList'
import type { RawValueMode } from './ObjectStore'
import { Patchable, PatchObserver } from './Patchable'
import { PatchableStore } from './PatchableStore'

export enum PatchableListPatchType {
	Splice,
	Update
}

export interface PatchableListSubPatch<P> {
	_patch_type: PatchableListPatchType
	startIndex?: number
	deleteCount?: number
	items?: P[]
}

export type PatchableListPatch<P> = P[] | PatchableListSubPatch<P>

// TODO: Maybe this should be `PatchableCollectionOptions?`
export interface PatchableListOptions {
	clean?: boolean
	patchItems?: boolean
}

const defaultOptions: PatchableListOptions = { clean: true }

type AdditionDeletionHandler<V> = (added: V[], deleted: V[]) => void

// This type does _not_ support mutable arrays
export abstract class PatchableList<V, P> extends PatchableStore<V[], PatchableListPatch<P>> {

	private options: PatchableListOptions

	// The observer used to watch for lower items
	private itemObserver?: PatchObserver

	private additionDeletionHandlers?: AdditionDeletionHandler<V>[]

	constructor(value?: V[], options?: PatchableListOptions) {
		super(value || [])
		this.options = options ? {...defaultOptions, ...options} : defaultOptions

		if (this.options.patchItems) {
			this.itemObserver = (patch, reverse, item) => {
				if (!this.isPatching) {
					const index = this.value.indexOf(item)
					this.publishPatch({
						_patch_type: PatchableListPatchType.Update,
						startIndex: index,
						items: [patch]
					}, {
						_patch_type: PatchableListPatchType.Update,
						startIndex: index,
						items: [reverse]
					})
				}
			}
			for (const item of this.value) {
				if (Patchable.isPatchable(item)) {
					item.observePatch(this.itemObserver)
				}
			}
		}
	}

	[Symbol.iterator]() {
		return this._value[Symbol.iterator]()
	}

	get(index: number) {
		return this._value[index]
	}

	get length() {
		return this._value.length
	}

	add(value: V | V[]) {
		this.insert(this._value.length, value)
	}

	addUnique(value: V) {
		const index = this.indexOf(value)
		if (index < 0) {
			this.add(value)
		}
	}

	insert(index: number, value: V | V[]) {
		if (Array.isArray(value)) {
			this.splice(index, 0, ...value)
		}
		else {
			this.splice(index, 0, value)
		}
	}

	remove(value: V) {
		const index = this._value.indexOf(value)
		if (index >= 0) {
			this.removeAt(index)
		}
	}

	removeAt(index: number) {
		return this.splice(index, 1)
	}

	splice(start: number, deleteCount?: number, ...items: V[]) {
		let list = this.value
		deleteCount = deleteCount ?? list.length - start
		let oldValues = list.splice(start, deleteCount, ...items)

		if (this.options.patchItems) {
			for (const oldValue of oldValues) {
				if (Patchable.isPatchable(oldValue)) {
					oldValue.unobservePatch(this.itemObserver)
				}
			}

			for (const newValue of items) {
				if (Patchable.isPatchable(newValue)) {
					newValue.observePatch(this.itemObserver)
				}
			}
		}

		if (this.additionDeletionHandlers?.length) {
			for (const handler of this.additionDeletionHandlers) {
				handler(items, oldValues)
			}
		}

		// We will handle the patch and can bypass the normal mechanism
		this.notifyObservers()

		if (!this.isPatching) {
			const patch: PatchableListSubPatch<P> = {
				_patch_type: PatchableListPatchType.Splice,
				startIndex: start
			}

			if (deleteCount > 0) {
				patch.deleteCount = deleteCount
			}

			if (items.length) {
				patch.items = items.map(this.convertToPatchItem)
			}

			const reverse: PatchableListSubPatch<P> = {
				_patch_type: PatchableListPatchType.Splice,
				startIndex: start
			}

			if (items.length) {
				reverse.deleteCount = items.length
			}

			if (oldValues.length) {
				reverse.items = oldValues.map(this.convertToPatchItem)
			}

			this.publishPatch(patch, reverse)
		}
	}

	/**
	 * Returns a copy of a section of an array. For both start and end, a negative index can be used to indicate an offset from the end of the array. For example, -2 refers to the second to last element of the array.
	 * @param start The beginning index of the specified portion of the array. If start is undefined, then the slice begins at index 0.
	 * @param end The end index of the specified portion of the array. This is exclusive of the element at the index 'end'. If end is undefined, then the slice extends to the end of the array.
	 */
	slice(start?: number, end?: number) {
		return this._value.slice(start, end)
	}

	indexOf(item: V) {
		return this._value.indexOf(item)
	}

	includes(item: V) {
		return this._value.includes(item)
	}

	observeAdditionsAndDeletions(handler: AdditionDeletionHandler<V>) {
		return lazyInitializeSubscriptionList(this, 'additionDeletionHandlers', handler)
	}

	protected onValueChanged(oldList?: V[]) {
		if (this.options.patchItems) {
			for (const item of oldList) {
				if (Patchable.isPatchable(item)) {
					item.unobservePatch(this.itemObserver)
				}
			}

			for (const item of this._value) {
				if (Patchable.isPatchable(item)) {
					item.observePatch(this.itemObserver)
				}
			}
		}
		if (this.additionDeletionHandlers?.length) {
			for (const handler of this.additionDeletionHandlers) {
				handler(this._value, oldList)
			}
		}
		super.onValueChanged(oldList)
	}

	applyPatch(patch: PatchableListPatch<P>): boolean {
		this.isPatching = true
		let changed = false

		if (Array.isArray(patch)) {
			const values = this.value

			if (this.options.patchItems) {

				// This malarky is done so that patching a list with a patch
				// that would create an identical list is treated as not being
				// a change
				let index = 0;
				for (; index < patch.length && index < values.length; index++) {
					const value = values[index]
					if (Patchable.isPatchable(value)) {
						changed = value.applyPatch(patch[index]) || changed
					}
				}

				if (values.length > patch.length) {
					// Remove values no longer in the patch
					this.splice(patch.length, values.length - patch.length)
					changed = true
				}
				else if (values.length < patch.length) {
					// Add the new items not in the list
					const newItems: V[] = []
					const cleaned = this.fillListFromPatchList(newItems, patch.slice(values.length))
					this.splice(values.length, 0, ...newItems)
					if (cleaned) {
						this.publishPatch(this.convertToPatch(this.value), null)
					}
					changed = true
				}
			}
			else {
				changed = true
				
				// Without patchable items, we still want to know if things are changing
				if (values.length === patch.length) {
					if (deepEqual(this.convertToPatch(values), patch)) {
						changed = false
					}
				}

				if (changed) {
					let result: V[] = []
					const cleaned = this.fillListFromPatchList(result, patch)
					if (cleaned) {
						this.publishPatch(this.convertToPatch(result), null)
					}

					this.value = result
				}
			}
		}
		else if (patch._patch_type === PatchableListPatchType.Update) {
			if (Array.isArray(patch.items)) {
				const values = this.value
				let index = patch.startIndex
				for (const patchItem of patch.items) {
					const value = values[index]
					if (Patchable.isPatchable(value)) {
						changed = value.applyPatch(patchItem) || changed
					}
					index++
				}
			}
		}
		else if (patch._patch_type === PatchableListPatchType.Splice) {

			let result: V[] = []
			const cleaned = this.fillListFromPatchList(result, patch.items)

			if (patch._patch_type === PatchableListPatchType.Splice) {
				let newValue = this.value.slice()
				newValue.splice(patch.startIndex, patch.deleteCount ?? 0, ...result)
				result = newValue
			}

			if (cleaned) {
				this.publishPatch(this.convertToPatch(result), null)
			}

			this.value = result

			changed = true
		}

		this.isPatching = false
		return changed
	}

	protected convertFromPatch(patch: PatchableListPatch<P>) {
		console.error('This function intentionally unimplemented. See ApplyPatch()')
		return undefined
	}

	/**
	 * Fills a list from a given patch list
	 * @returns Whether or not the list was cleaned
	 */
	protected fillListFromPatchList(resultList: V[], patchList: P[]): boolean {
		let cleaned = false

		if (Array.isArray(patchList)) {
			for (const patchItem of patchList) {
				const value = this.convertFromPatchItem(patchItem)
				if (value || !this.options.clean) {
					resultList.push(value)
				}
				else {
					cleaned = true
				}
			}
		}

		return cleaned
	}

	protected convertToPatch(value: V[], mode?: RawValueMode): P[] {
		// This path always sets
		if (value == null) return value as any
		return value.map(item => this.convertToPatchItem(item, mode))
	}

	protected convertToPatchItem(item: V, mode?: RawValueMode | number): P {
		// This default implementation should be customized
		return (item as any).getRawValues(typeof mode === 'string' ? mode : 'patch') as P
	}

	protected abstract convertFromPatchItem(patchItem: P)
}

/**
 * A Patchable list for JSON-serializable values
 */
export class RawPatchableList<T> extends PatchableList<T, T> {
	protected convertFromPatchItem(patchItem: T): T {
		return patchItem
	}

	protected convertToPatchItem(item: T, mode?: number | RawValueMode): T {
		return item
	}

}
