export function initDebugFlags<T>(flags: T) {
	const anyWindow = window as any
	if (!anyWindow.__debug) {
		anyWindow.__debug = {}
	}
	Object.assign(anyWindow.__debug, flags)
}

export function getDebugFlags<T>(): T {
	return (window as any).__debug as T
}