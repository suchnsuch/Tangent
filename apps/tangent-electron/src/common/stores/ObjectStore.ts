import { get } from 'svelte/store'
import type { PatchObserver } from './Patchable'
import type { Patchable } from './Patchable'
import { PatchableListPatchType, PatchableListSubPatch } from './PatchableList'
import { PatchableMapPatchType, PatchableMapSubPatch } from './PatchableMap'
import { SelfStore } from './SelfStore'

function getPropertyDescriptor(o, name:PropertyKey): PropertyDescriptor {
	let proto = o, descriptor: PropertyDescriptor = null

	while (proto && !descriptor) {
		descriptor = Object.getOwnPropertyDescriptor(proto, name)
		proto = proto.__proto__
	}

	return descriptor
}

export interface ObjectStoreOptions {
	applyToRawValues?: boolean
	/**
	 * A list of keys that will not be patched in either direction
	 */
	patchBlockList?: string[]
}

export type RawValueMode = 'patch' | 'file'

const defaultOptions: ObjectStoreOptions = {
	applyToRawValues: false
}

function isPatchCompatibleValue(value: any) {
	if (typeof value === 'object' && !Array.isArray(value)) {
		if (Object.getPrototypeOf(value).constructor !== Object) {
			return false
		}
	}
	else if (typeof value === 'function') {
		return false
	}
	return true
}

/**
 * Applies a patch to an object
 * @param target The object or ObjectStore to apply changes to
 * @param patch The patch object of values to apply
 * @param options Configuration options
 * @returns Whether or not the patch resulted in a change
 */
export function applyPatch(target: any, patch: any, options: ObjectStoreOptions): boolean {

	let changed = false

	for (let key of Object.keys(patch)) {

		if (key.startsWith('_') || (options.patchBlockList && options.patchBlockList.includes(key))) {
			continue
		}

		let patchValue = patch[key]
		let localValue = target[key]

		if ((localValue === null || localValue === undefined) && !options.applyToRawValues) {
			continue
		}
		
		if (typeof localValue?.applyPatch === 'function') {
			changed = localValue.applyPatch(patchValue) || changed
		}
		else if (typeof localValue?.set === 'function') {
			changed = changed || localValue.value !== patchValue
			localValue.set(patchValue)
		}
		else if (options.applyToRawValues) {
			// Apply patch value directly to the object
			if (patchValue != null && typeof patchValue === 'object' && !Array.isArray(patchValue)) {

				// Handle special cases
				if (`_patch_type` in patchValue) {
					if (typeof localValue === 'object') {
						if (Array.isArray(localValue)) {
							// Assume List
							const listPatch = patchValue as PatchableListSubPatch<any>
							switch (listPatch._patch_type) {
								case PatchableListPatchType.Splice:
									localValue.splice(listPatch.startIndex, listPatch.deleteCount, ...(listPatch.items || []))
									changed = true
									break
								case PatchableListPatchType.Update:
									let index = listPatch.startIndex
									for (const item of listPatch.items) {
										changed = applyPatch(localValue[index], item, options) || changed
										index++
									}
									break
							}
						}
						else {
							// Assume Map
							const mapPatch = patchValue as PatchableMapSubPatch<any>
							switch (mapPatch._patch_type) {
								case PatchableMapPatchType.Update:
									changed = applyPatch(localValue, mapPatch.patch, options) || changed
									break
								case PatchableMapPatchType.Set:
									// TODO: Patch can be null
									for (const key of Object.keys(mapPatch.patch)) {
										localValue[key] = mapPatch.patch[key]
									}
									changed = true
									break
								case PatchableMapPatchType.Delete:
									for (const key of Object.keys(mapPatch.patch)) {
										delete localValue[key]
									}
									changed = true
									break
							}
						}
					}
					else {
						// Fill from patch
						const nextValue = patchValue.items || patchValue.patch
						changed = changed || target[key] !== nextValue
						target[key] = nextValue
					}
				}
				else if (localValue != null && typeof localValue === 'object') {
					changed = applyPatch(localValue, patchValue, options) || changed
				}
				else {
					changed = changed || target[key] !== patchValue
					target[key] = patchValue
				}
			}
			else {
				changed = changed || target[key] !== patchValue
				target[key] = patchValue
			}
		}
	}

	return changed
}

export class ObjectStore extends SelfStore implements Patchable {
	_isPatching = false
	private _storeOptions: ObjectStoreOptions
	private _observables = []
	private _patchObservers: PatchObserver[] = []

	constructor(options?: ObjectStoreOptions) {
		super()
		this._storeOptions = options || defaultOptions
	}

	protected isKeyPatchable(key: string) {
		return !key.startsWith('_') &&
			(!this._storeOptions.patchBlockList || !this._storeOptions.patchBlockList.includes(key))
	}

	setupObservables() {
		if (this._observables.length) {
			return
		}
		this._isPatching = true
		for (let key of Object.keys(this)) {
			let value = this[key]

			if (value === null || value === undefined || !this.isKeyPatchable(key)) {
				continue
			}

			if (typeof value.observePatch === 'function') {
				// Forward the patch upwards
				this._observables.push(value.observePatch(
					(newValue, oldValue) => this.onValueChanged(key, newValue, oldValue)))
			}
			else if (typeof value.subscribe === 'function' && typeof value.set === 'function') {
				// "Leaf" value changed, push patch
				this._observables.push(value.subscribe(
					(newValue, oldValue) => this.onValueChanged(key, newValue, oldValue)))
			}

			if (typeof value.setupObservables === 'function') {
				value.setupObservables()
			}
		}
		this._isPatching = false
	}

	dispose() {
		super.dispose()
		this._observables.forEach(o => o())

		for (const key of Object.keys(this)) {
			const value = this[key]
			if (value && typeof value.dispose === 'function') {
				value.dispose()
			}
		}

		this._patchObservers = null
	}

	applyPatch(patch, sendPatch=false) {
		if (!patch) return // should probably be the caller's problem, but I'm lazy
		this._isPatching = true
		const changed = applyPatch(this, patch, this._storeOptions)
		if (sendPatch) {
			this.sendPatch(patch, null)
		}
		this._isPatching = false
		return changed
	}

	getRawValues(mode: RawValueMode = 'patch'): any {
		let result = {}
		let includedValue = false
		for (let key of Object.keys(this)) {
			let value = this[key]

			if (value === null || value === undefined || !this.isKeyPatchable(key)) {
				continue
			}

			if (typeof value.getRawValues === 'function') {
				const patchValue = value.getRawValues(mode)
				if (mode === 'patch' || patchValue != undefined) {
					// Always send 'undefined' values in patches
					result[key] = patchValue
					includedValue = true
				}
			}
			else if (typeof value.subscribe === 'function' && typeof value.set === 'function') {
				// Check for exposed `get value()`
				let descriptor = getPropertyDescriptor(value, 'value')
				if (descriptor && descriptor.get !== undefined) {
					result[key] = value.value
				}
				else {
					// Fallback to svelte get
					result[key] = get(value)
				}
				includedValue = true
			}
			else if (this._storeOptions.applyToRawValues && isPatchCompatibleValue(value)) {
				result[key] = value
				includedValue = true
			}
		}

		if (!includedValue && mode === 'file') {
			// This makes the assumption that an object with nothing in it gives as much
			// information as no object at all.
			return undefined
		}
		return result
	}

	observePatch(observer: PatchObserver) {
		// Capture the list so that unsub functions still work
		// even if `this` is garbage collected
		const list = this._patchObservers
		this._patchObservers.push(observer)

		return () => {
			this.unobservePatch(observer, list)
		}
	}

	unobservePatch(observer: PatchObserver, list?: PatchObserver[]) {
		list = list || this._patchObservers
		let index = list.indexOf(observer)
		if (index >= 0) {
			list.splice(index, 1)
		}
	}

	protected onValueChanged(key: string, newValue: any, oldValue: any) {
		if (!this._isPatching) {

			// Patches must be basic value types (string, number, array, raw object)
			if (!isPatchCompatibleValue(newValue)) {
				return
			}

			this.sendPatch({
				[key]: newValue
			}, {
				[key]: oldValue
			})
		}
	}

	protected sendPatch(patch: any, reverse: any) {
		for (let observer of this._patchObservers) {
			observer(patch, reverse, this)
		}
	}
}