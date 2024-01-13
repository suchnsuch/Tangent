import type { Readable, Writable } from 'svelte/store'
import { WritableStore } from './WritableStore'

/**
 * This provides a simple way of forwarding the value of stores from other stores.
 * This provides effective value-equality de-bouncing. A raw Svelte update that
 * hands you the same value will not produce a value update.
 * 
 * This lets you do this:
 * ```svelte
 * export let myStoreSource
 * const store = new ForwardingStore<MyValue>()
 * $: store.forwardFrom(myStoreSource.store)
 * 
 * // And later
 * $store.value // Will be de-bounced
 * ```
 */
export class ForwardingStore<T> extends WritableStore<T> {

	_store: Readable<T> | Writable<T>
	_unsub: () => void

	// Bind this store to another store
	forwardFrom(store: Readable<T> | Writable<T>) {
		if (store !== this._store) {
			if (this._unsub) this._unsub()
			this._store = store

			if (store) {
				this._unsub = store.subscribe(v => this.value = v)
			}
			else {
				this._unsub = undefined
				this.set(undefined)
			}
		}
	}

	set(value: T) {
		if (this._store && 'set' in this._store) {
			this._store.set(value)
		}
		else {
			super.set(value)
		}
	}
}
