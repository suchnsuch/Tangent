import { PatchableStore } from './PatchableStore'

export class TranslatingPatcher<T, P> extends PatchableStore<T, P> {

	_translateFromPatch: (P) => T
	_translateToPatch: (T) => P

	constructor(
		value: T,
		fromPatch: (P) => T,
		toPatch: (T) => P
		)
	{
		super(value)
		this._translateFromPatch = fromPatch
		this._translateToPatch = toPatch
	}

	protected convertFromPatch(patch) {
		return this._translateFromPatch(patch)
	}

	protected convertToPatch(value) {
		return this._translateToPatch(value)
	}
}
