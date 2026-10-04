import type { Writable } from "svelte/store"

export interface PopupEventInit extends EventInit {
	isOpen: boolean
}

export type PopUpCloseHandler = () => void

export class PopupEvent extends Event {
	readonly isOpen: boolean

	closeHandlers: PopUpCloseHandler[] = []

	constructor(type: string, init: PopupEventInit) {
		super(type, init)
		this.isOpen = init.isOpen
	}

	/** Allows observers to notice when a handler is closed even when the popup is not in the dom */
	onClose(handler: PopUpCloseHandler) {
		this.closeHandlers.push(handler)
	}
}

export type CountPopUpsOptions = {
	counter: Writable<number>
} | Writable<number>

export function countPopUps(element: HTMLElement, options: CountPopUpsOptions) {
	const counter = 'set' in options ? options : options.counter
	
	function onPopUpClose() {
		counter.update(i => i - 1)
	}

	function onPopUpOpen(event: PopupEvent) {
		counter.update(i => i + 1)
		event.onClose(onPopUpClose)
	}

	element.addEventListener('popup-open', onPopUpOpen)

	return {
		destroy() {
			element.removeEventListener('popup-open', onPopUpOpen)
		}
	}
}
