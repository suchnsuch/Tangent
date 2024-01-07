import type { Readable } from 'svelte/store'

/**
 * A convenience function that will handle the value in a store
 * until a condition is met or a timeout is reached
 * @param store 
 * @param handler 
 * @param timeout 
 */
export function subscribeUntil<T>(store: Readable<T>, handler: (value: T) => boolean, timeout?: number) {
	var unsub: () => void = null

	const t = timeout ? setTimeout(() => {
		if (unsub) {
			unsub()
			unsub = null
		}
	}, timeout) : null

	function cancel() {
		if (t) clearTimeout(t)

		if (unsub) {
			unsub()
			unsub = null
		}
	}

	unsub = store.subscribe(value => {
		if (handler(value)) {
			cancel()
		}
	})

	return cancel
}
