import { isValue } from "@such-n-such/core";
import type { RawValueMode } from './ObjectStore';
import { Patchable } from "./Patchable";
import { PatchableStore } from "./PatchableStore";
import { deepEqual } from 'fast-equals';

export interface PatchableMapRawPatch<P> {
	[key: string]: P
}

export enum PatchableMapPatchType {
	Set,
	Delete,
	Update
}

export interface PatchableMapSubPatch<P> {
	// Uses underscore for as little cross-contamination to a raw object as possible
	_patch_type: PatchableMapPatchType,
	patch: PatchableMapRawPatch<P>
}

export function isPatchableMapSubPatch<P>(patch: PatchableMapPatch<P>): patch is PatchableMapSubPatch<P> {
	return typeof patch._patch_type === 'number' && patch.patch !== undefined
}

export type PatchableMapPatch<P> = PatchableMapRawPatch<P> | PatchableMapSubPatch<P>

// TODO: Maybe this should be `PatchableCollectionOptions?`
export interface PatchableMapOptions {
	clean?: boolean
	observeItems?: boolean
}

const defaultOptions: PatchableMapOptions = { clean: true }

export abstract class PatchableMap<K, V, P> extends PatchableStore<Map<K, V>, PatchableMapPatch<P>> {

	private options: PatchableMapOptions
	private itemUnsubs?: Map<K, () => void>

	constructor(value?: Map<K, V>, options?: PatchableMapOptions) {
		super(value || new Map())
		this.options = options ? {...defaultOptions, ...options} : defaultOptions

		if (this.options.observeItems) {
			this.itemUnsubs = new Map()

			for (const [key, value] of this.value.entries()) {
				this.observeItem(key, value)
			}
		}
	}

	protected observeItem(key: K, value: V) {
		const existing = this._value.get(key)
		if (!this.options.observeItems) return existing

		const unsub = this.itemUnsubs.get(key)

		// We always want to create a new sub if none exists
		let needsNewSub = !unsub || existing !== value

		if (unsub && needsNewSub) {
			unsub()
		}

		if (needsNewSub && Patchable.isPatchable(value)) {
			this.itemUnsubs.set(key, value.observePatch((patch, reverse) => {
				this.publishPatch({
					_patch_type: PatchableMapPatchType.Update,
					patch: {
						[this.convertKeyToPatch(key)]: patch
					}
				}, {
					_patch_type: PatchableMapPatchType.Update,
					patch: {
						[this.convertKeyToPatch(key)]: reverse
					}
				})
			}))
		}

		return existing
	}

	[Symbol.iterator]() {
		return this._value[Symbol.iterator]()
	}

	set(map: Map<K, V>)
	set(key: K, value: V)
	set(key: Map<K, V> | K, value?: V) {
		if (key instanceof Map || key == null) {
			// We are setting the map directly
			super.set(key as Map<K, V>)
			return
		}

		const existing = this.observeItem(key, value)
		this._value.set(key, value)

		// We will handle the patch and can bypass the normal mechanism
		this.notifyObservers()

		if (!this.isPatching) {
			const patchKey = this.convertKeyToPatch(key)
			this.publishPatch({
				_patch_type: PatchableMapPatchType.Set,
				patch: {
					[patchKey]: this.convertValueToPatch(value)
				}
			}, {
				_patch_type: existing ? PatchableMapPatchType.Set : PatchableMapPatchType.Delete,
				patch: {
					[patchKey]: existing != null ? this.convertValueToPatch(existing) : null
				}
			})
		}
	}

	get(key: K) {
		return this._value.get(key)
	}

	delete(key: K) {
		const existing = this._value.get(key)
		this._value.delete(key)

		if (this.itemUnsubs) {
			const unsub = this.itemUnsubs.get(key)
			if (unsub) {
				unsub()
				this.itemUnsubs.delete(key)
			}
		}

		// We will handle the patch and can bypass the normal mechanism
		this.notifyObservers()

		if (!this.isPatching) {
			let patchKey = this.convertKeyToPatch(key)
			this.publishPatch({
				_patch_type: PatchableMapPatchType.Delete,
				patch: {
					[patchKey]: null
				}
			}, {
				_patch_type: PatchableMapPatchType.Set,
				patch: {
					[patchKey]: this.convertValueToPatch(existing)
				}
			})
		}
	}

	clear() {
		if (this.itemUnsubs) {
			for (const unsub of this.itemUnsubs.values()) {
				if (unsub) unsub()
			}
			this.itemUnsubs.clear()
		}

		let patch = {}
		let reverse = {}

		for (const key of this._value.keys()) {
			const patchKey = this.convertKeyToPatch(key)
			patch[patchKey] = null
			reverse[patchKey] = this.convertValueToPatch(this._value.get(key))
		}

		this._value.clear()

		this.notifyObservers()

		if (!this.isPatching) {
			this.publishPatch({
				_patch_type: PatchableMapPatchType.Delete,
				patch
			}, {
				_patch_type: PatchableMapPatchType.Set,
				patch: reverse
			})
		}
	}

	entries() {
		return this._value.entries()
	}

	keys() {
		return this._value.keys()
	}

	values() {
		return this._value.values()
	}

	get size() {
		return this._value.size
	}

	applyPatch(patch: PatchableMapPatch<P>): boolean {
		this.isPatching = true
		let changed = false
		let cleaned = false

		let map = this._value

		if (isPatchableMapSubPatch(patch)) {
			switch (patch._patch_type) {
				case PatchableMapPatchType.Set:
					for (const patchKey of Object.keys(patch.patch)) {
						const key = this.convertPatchKeyToKey(patchKey)
						const value = this.convertPatchValueToValue(patch.patch[patchKey])
						if ((isValue(key) && isValue(value)) || !this.options.clean) {
							if (this.options.observeItems && Patchable.isPatchable(value)) {
								this.observeItem(key, value)
							}
							this.set(key, value)
							changed = true
						}
						else {
							cleaned = true
						}
					}
					break
				case PatchableMapPatchType.Delete:
					for (const patchKey of Object.keys(patch.patch)) {
						const key = this.convertPatchKeyToKey(patchKey)
						if (isValue(key) || !this.options.clean) {
							this.delete(key)
							changed = true
						}
						else {
							cleaned = true
						}
					}
					break
				case PatchableMapPatchType.Update:
					for (const patchKey of Object.keys(patch.patch)) {
						const key = this.convertPatchKeyToKey(patchKey)
						const item = map.get(key)
						if (isValue(key) && isValue(item)) {
							if (Patchable.isPatchable(item)) {
								changed = item.applyPatch(patch.patch[patchKey]) || changed
							}
						}
						else if (this.options.clean) {
							cleaned = true
						}
					}
					break
			}
		}
		else if (this.options.observeItems) {
			// Patching a patchable map with a patch that would create an identical map
			// should be treated as not being a change

			const unsetKeys = new Set<K>(this.keys())

			for (const patchKey of Object.keys(patch)) {
				const key = this.convertPatchKeyToKey(patchKey)
				if (this.options.clean && !isValue(key)) {
					cleaned = true
					continue
				}

				const existing = map.get(key)
				if (existing && Patchable.isPatchable(existing)) {
					unsetKeys.delete(key)
					// Apply the patch over the existing item
					changed = existing.applyPatch(patch[patchKey]) || changed
				}
				else {
					// Add a new item
					const value = this.convertPatchValueToValue(patch[patchKey])
					if (isValue(value) || !this.options.clean) {
						this.observeItem(key, value)
						map.set(key, value)
						changed = true
					}
				}
			}

			// Remove keys that were not present in the incoming patch
			for (const key of unsetKeys) {
				map.delete(key)
				changed = true
			}
		}
		else {
			// Rebuild a new map
			map = new Map()
			changed = true

			for (const patchKey of Object.keys(patch)) {
				const key = this.convertPatchKeyToKey(patchKey)
				const value = this.convertPatchValueToValue(patch[patchKey])
				if ((isValue(key) && isValue(value)) || !this.options.clean) {
					map.set(key, value)
				}
				else {
					cleaned = true
				}
			}

			// Confirm that the map has changed
			if (map.size === this._value.size) {
				if (deepEqual(this.convertToPatch(this._value), patch)) {
					changed = false
				}
			}

			if (changed) {
				this.value = map
			}
		}

		if (cleaned) {
			this.publishPatch(this.convertToPatch(this._value), null)
		}

		this.isPatching = false
		return changed
	}

	protected convertFromPatch(patch: PatchableMapPatch<P>) {
		console.error('This function intentionally unimplemented. See ApplyPatch()')
		return undefined
	}

	protected convertToPatch(map: Map<K, V>, mode: RawValueMode = 'patch') {
		if (!map) return null
		
		const result = {}

		for (const [key, value] of map.entries()) {
			result[this.convertKeyToPatch(key)] = this.convertValueToPatch(value, mode)
		}

		return result
	}
	
	protected onValueChanged(oldMap?: Map<K, V>) {
		if (this.options.observeItems) {
			if (oldMap) {
				for (const key of oldMap.keys()) {
					const unsub = this.itemUnsubs.get(key)
					if (unsub) {
						unsub()
						this.itemUnsubs.delete(key)
					}
				}
			}

			for (const [key, value] of this._value.entries()) {
				this.observeItem(key, value)
			}
		}

		super.onValueChanged(oldMap)
	}

	protected abstract convertKeyToPatch(key: K): string
	protected abstract convertPatchKeyToKey(patchKey: string): K

	protected convertValueToPatch(value: V, mode: RawValueMode = 'patch'): P {
		return (value as any).getRawValues(mode) as P
	}
	protected abstract convertPatchValueToValue(patchValue: P): V
}
