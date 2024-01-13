/**
 * Implements the [Svelte store contract](https://svelte.dev/docs#Store_contract) for
 * an object. By calling notifyChanged(), any subscribers will be immediately pushed
 * a function with a reference to `this`.
 */
export class SelfStore {

	private _selfStoreObservers: ((value: this) => void)[]

	constructor() {
		this._selfStoreObservers = []
	}

	subscribe(observerFunc: (value: this) => void): () => void {
		const list = this._selfStoreObservers
		list.push(observerFunc)
		observerFunc(this)
		return () => {
			list.splice(list.indexOf(observerFunc), 1)
		}
	}

	notifyChanged() {
		for (let observer of this._selfStoreObservers) {
			observer(this)
		}
	}

	dispose() {
		this._selfStoreObservers = null
	}
}
