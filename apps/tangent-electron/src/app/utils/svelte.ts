import type { Component, SvelteComponent } from "svelte"
import { writable } from 'svelte/store'

export type SvelteConstructor = (new (...args: any[]) => SvelteComponent) | Component

export function mediaQueryStore(query: string) {
	const mediaQuery = window.matchMedia(query)

	const store = writable(mediaQuery.matches)
	mediaQuery.addEventListener('change', q => {
		store.set(q.matches)
	})

	return {
		subscribe: store.subscribe
	}
}

export interface timedLatchOptions<T> {
	delay: (value: T, oldValue?: T) => number
}
function defaultTimedLatchDelay(value) {
	return value ? 0 : 500
}
/**
 * Creates a store that can delay propegation of values by an amount of time
 * @param initialValue The initial, undelayed value of the store
 * @param delay A function that returns the amount of delay that will occur before the value propegates
 */
export function timedLatch<T>(initialValue: T, delay?: (value: T, oldValue?: T) => number) {
	delay = delay ?? defaultTimedLatchDelay

	let value = initialValue
	let timeout = null
	const { subscribe, set } = writable(initialValue)

	function update(newValue: T) {
		if (newValue != value) {
			if (timeout) {
				clearTimeout(timeout)
				timeout = null
			}
			const delayTime = delay(newValue, value)
			value = newValue
			if (delayTime > 0) {
				timeout = setTimeout(() => {
					set(value)
				}, delayTime)
			}
			else {
				set(value)
			}
		}
	}

	return {
		subscribe,
		update
	}
}
