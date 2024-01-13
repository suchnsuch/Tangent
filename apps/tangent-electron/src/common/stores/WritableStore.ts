import { ReadableStore } from "./ReadableStore"

/**
 * Implements the [Svelte store contract](https://svelte.dev/docs#Store_contract)
 * while providing a simple getter & setter interface to the underlying value
 */
export class WritableStore<T> extends ReadableStore<T> {

	constructor(value: T) {
		super(value)
	}

	// Reimplement to save on prototype chain headache
	get value() { return this._value }

	set value(value: T) {
		if (this._value != value) {
			const oldValue = this._value
			this._value = value

			this.onValueChanged(oldValue)
		}
	}

	protected onValueChanged(oldValue?: T) {
		this.notifyObservers(oldValue)
	}

	set(value: T) {
		this.value = value
	}

	update(updater: (value: T) => T) {
		this.value = updater(this.value)
		return this.value
	}
}
