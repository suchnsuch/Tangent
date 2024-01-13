import { stringOr } from '@such-n-such/core'

export type AnnotatedFocusEvent = FocusEvent & {
	/** A higher number  */
	layer?: string
}

export namespace Focus {
	export function annotate(event: FocusEvent, layer: string) {
		const currentLayer = (event as AnnotatedFocusEvent).layer
		if (!currentLayer) {
			(event as AnnotatedFocusEvent).layer = layer
		}
	}

	export function getLayer(event: FocusEvent) {
		return stringOr((event as AnnotatedFocusEvent).layer, 'default')
	}
}

export function focusLayer(node: HTMLElement, layer: string) {
	function annotate(event: FocusEvent) {
		Focus.annotate(event, layer)
	}

	node.addEventListener('focusin', annotate)
	node.addEventListener('focusout', annotate)

	return {
		destroy() {
			node.removeEventListener('focusin', annotate)
			node.removeEventListener('focusout', annotate)
		}
	}
}
