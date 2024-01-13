import type { Readable } from 'svelte/store';

export interface ClassStoreActionOptions<T> {
	store: Readable<T>
	
	className?: string
}

// A bit of a hack to bind a store directly to a class name
// Will require use of `:global(.class)` in css to actually work
export default function classStore<T>(node: HTMLElement, params: ClassStoreActionOptions<T>) {
	if (!params) return

	let unsub: () => void = null
	let lastClassName: string = null

	function update(params: ClassStoreActionOptions<T>) {
		if (unsub) unsub()

		unsub = params.store.subscribe(v => {
			if (params.className) {
				if (v) {
					node.classList.add(params.className)
				}
				else {
					node.classList.remove(params.className)
				}
			}
			else {
				let newClassName = v == null ? null : "" + v
				if (newClassName !== lastClassName) {
					node.classList.remove(lastClassName)
					node.classList.add(newClassName)
					lastClassName = newClassName
				}
			}
		})
	}

	update(params)

	return {
		update
	}
}
