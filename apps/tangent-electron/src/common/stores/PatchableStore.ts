import type { RawValueMode } from './ObjectStore'
import type { PatchObserver } from './Patchable'
import type { Patchable } from './Patchable'
import { WritableStore } from './WritableStore'

export abstract class PatchableStore<V, P> extends WritableStore<V> implements Patchable {

	protected isPatching = false

	private _patchObservers: PatchObserver[] = []

	constructor(value: V) {
		super(value)
	}

	applyPatch(patch: P) {
		this.isPatching = true
		const newValue = this.validateValue(this.convertFromPatch(patch))
		const changed = this.value !== newValue
		this.value = newValue
		this.isPatching = false
		return changed
	}

	getRawValues(mode: RawValueMode = 'patch'): P {
		return this.convertToPatch(this.value, mode)
	}

	protected onValueChanged(oldValue?: V) {
		if (!this.isPatching) {
			this.publishPatch(
				this.convertToPatch(this.value, 'patch'),
				this.convertToPatch(oldValue, 'patch'))
		}
		super.onValueChanged(oldValue)
	}

	observePatch(observer: PatchObserver) {
		this._patchObservers.push(observer)

		return () => {
			this.unobservePatch(observer)
		}
	}

	unobservePatch(observer: PatchObserver) {
		const index = this._patchObservers.indexOf(observer)
		if (index >= 0) {
			this._patchObservers.splice(index, 1)
		}
	}

	protected publishPatch(patch: P, reverse: P) {
		for (let observer of this._patchObservers) {
			observer(patch, reverse, this._value)
		}
	}

	protected validateValue(value: V): V {
		return value
	}

	protected abstract convertFromPatch(patch: P): V
	protected abstract convertToPatch(value: V, mode?: RawValueMode): P
}
