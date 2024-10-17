import { swapRemove } from '@such-n-such/core'

export function rawOrStoreValue<T>(value: T | ReadableStore<T>) {
	if (value instanceof ReadableStore) return value.value
	return value
}

/**
 * A base class for stores that want to have .value field
 * and observers
 */
export class ReadableStore<T> {
	protected observers: ((value: T, oldValue?: T) => void)[]
	protected _value: T

	constructor(value: T) {
		this._value = value
		this.observers = []
	}

	get value(): T {
		return this._value
	}

	notifyObservers(oldValue?: T) {
		for (let observer of this.observers) {
			observer(this.value, oldValue)
		}
	}

	subscribe(observerFunc: (value: T, oldValue?: T) => void): () => void {
		this.observers.push(observerFunc)
		observerFunc(this.value)
		return () => {
			swapRemove(this.observers, observerFunc)
		}
	}

	ifHasValue(valueUser: (value: T) => any) {
		if (this._value !== null && this._value !== undefined) {
			valueUser(this._value)
		}
	}
}
