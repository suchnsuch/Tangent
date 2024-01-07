import type { Readable } from 'svelte/store'
import { ReadableStore } from './ReadableStore'

/**
 * Wraps a store, providing an always-available cache
 */
export class CachingStore<T> extends ReadableStore<T> {
	store: Readable<T>
	onValueChanging?: (prev: T, next: T) => void
	private unsub: () => void

	constructor(store: Readable<T>, onValueChanging?: (prev: T, next: T) => void) {
		super(null)
		this.store = store
		this.onValueChanging = onValueChanging
		this.unsub = store.subscribe(v => {
			if (v !== this._value) {
				if (this.onValueChanging) {
					this.onValueChanging(this._value, v)
				}
				this._value = v
				this.notifyObservers()
			}
		})
	}

	dispose() {
		if (this.onValueChanging) {
			this.onValueChanging(this._value, null)
		}
		this.unsub()
	}
}
