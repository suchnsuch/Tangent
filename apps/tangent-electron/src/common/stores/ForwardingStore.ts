import { get, type Readable, type Writable } from 'svelte/store'
import { WritableStore } from './WritableStore'
import { ReadableStore, type ObserverFunc } from './ReadableStore'

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
			this.unbind()
			this._store = store

			if (store) {
				// Pull and cache the current value
				this.bind()
				
				// If we're still unbound after this frame, drop
				// This prevents thrashing when forwarding & subscribing in the same frame
				if (this.observers.length === 0) {
					setTimeout(() => {
						if (this.observers.length === 0) {
							this.unbind()
						}
					})
				}
			}
			else {
				this._unsub = undefined
				this.set(undefined)
			}
		}
	}

	forwardFromRetainingCurrentValue(store: Readable<T> | Writable<T>) {
		if (store !== this._store) {
			const currentValue = this.value
			this.forwardFrom(store)
			if (currentValue !== undefined) {
				super.value = currentValue
			}
		}
	}

	protected bind() {
		if (this._store && !this._unsub) {
			this._unsub = this._store.subscribe(v => super.value = v)
		}
	}

	protected unbind() {
		if (this._unsub) {
			this._unsub()
			this._unsub = undefined
		}
	}

	subscribe(observerFunc: ObserverFunc<T>): () => void {

		if (this.observers.length === 0) {
			// We will have observers after this. Bind to the store.
			this.bind()
		}

		return super.subscribe(observerFunc)
	}

	protected onUnsubscribe(observerFunc: ObserverFunc<T>): void {
		super.onUnsubscribe(observerFunc)
		if (this.observers.length === 0) {
			// With no observers, we can disconnect from the parent store
			this.unbind()
		}
	}

	get value(): T {
		if (this._store && this.observers.length === 0) {
			// fallback re-cache
			if (this._store instanceof ReadableStore) {
				super.value = this._store.value
			}
			else {
				super.value = get(this._store)
			}
		}
		return super.value
	}

	set(value: T) {
		if (this._store && 'set' in this._store) {
			this._store.set(value)

			if (this.observers.length === 0) {
				// If there are no active observers, set our cache as well
				super.value = value
			}
		}
		else {
			super.value = value
		}
	}
}
