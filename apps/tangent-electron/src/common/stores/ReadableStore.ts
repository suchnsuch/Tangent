import { swapRemove } from '@such-n-such/core'

export function rawOrStoreValue<T>(value: T | ReadableStore<T>) {
	if (value instanceof ReadableStore) return value.value
	return value
}

export type ObserverFunc<T> = (value: T, oldValue?: T) => void

/**
 * A base class for stores that want to have .value field
 * and observers
 */
export class ReadableStore<T> {
	protected observers: ObserverFunc<T>[]
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

	subscribe(observerFunc: ObserverFunc<T>): () => void {
		this.observers.push(observerFunc)
		observerFunc(this.value)
		return () => this.onUnsubscribe(observerFunc)
	}

	protected onUnsubscribe(observerFunc: ObserverFunc<T>) {
		swapRemove(this.observers, observerFunc)
	}

	ifHasValue<R, D>(valueUser: (value: T) => R, otherwise?: D): R | D {
		if (this._value !== null && this._value !== undefined) {
			return valueUser(this._value)
		}
		return otherwise
	}
}
