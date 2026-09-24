import type { Writable } from "svelte/store"

export interface PopupEventInit extends EventInit {
	isOpen: boolean
}

export class PopupEvent extends Event {
	readonly isOpen: boolean

	constructor(type: string, init: PopupEventInit) {
		super(type, init)
		this.isOpen = init.isOpen
	}
}

export function sendPopUpEvent(source: HTMLElement, state: boolean) {
	source.dispatchEvent(new PopupEvent('popup', {
		isOpen: state,
		bubbles: true,
	}))
}

export type CountPopUpsOptions = {
	counter: Writable<number>
} | Writable<number>

export function countPopUps(element: HTMLElement, options: CountPopUpsOptions) {
	const counter = 'set' in options ? options : options.counter
	
	function onPopup(event: PopupEvent) {
		if (event.isOpen) {
			counter.update(i => i + 1)
		}
		else {
			counter.update(i => i - 1)
		}
	}

	element.addEventListener('popup-open', onPopup)
	element.addEventListener('popup-close', onPopup)

	return {
		destroy() {
			element.removeEventListener('popup-open', onPopup)
			element.removeEventListener('popup-close', onPopup)
		}
	}
}
