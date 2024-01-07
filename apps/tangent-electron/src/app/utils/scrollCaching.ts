import { tick } from 'svelte';
import { get, Writable } from 'svelte/store';

interface scrollParams {
	scrollY: Writable<number>,
	applicationDelay?: Promise<boolean|void>
} 

export function cachedScroll(node: HTMLElement, params: scrollParams) {
	const { scrollY, applicationDelay } = params

	;(applicationDelay ?? tick()).then(apply => {
		if (apply !== false) {
			const scrollValue = get(scrollY)
			if (scrollValue >= 0) {
				node.scrollTop = scrollValue
			}
		}
	})

	function onWheel(event: MouseEvent) {
		requestAnimationFrame(() => {
			if (scrollY) scrollY.set(node.scrollTop)
		})
	}

	node.addEventListener('scroll', onWheel)

	return {
		destroy() {
			node.removeEventListener('scroll', onWheel)
		}
	}
}
