import { createPopper, Options, VirtualElement } from '@popperjs/core'

type OurOptions = Partial<Options> & {
	reference?: HTMLElement | VirtualElement
	escapeToRoot?: boolean
	onExit?: (event: Event) => void
}

let nextPopperId = 1
function getPopperId() {
	return nextPopperId++
}

function isEventMarked(event, popperId) {
	return event.popup && event.popup.has(popperId)
}

export default function popper(element: HTMLElement, inOptions: OurOptions) {

	let popper = null
	let options: OurOptions = null

	let popperId = getPopperId()

	function exit(event: Event) {
		if (options?.onExit) options?.onExit(event)
	}

	function markAsPopperEvent(event) {
		if (!event.popup) event.popup = new Set()
		const set = event.popup as Set<any>
		set.add(popperId)
	}

	element.addEventListener('click', markAsPopperEvent)
	element.addEventListener('keydown', markAsPopperEvent)
	
	function windowClick(event: MouseEvent) {
		if (event.defaultPrevented) return
		if (!isEventMarked(event, popperId)) {
			exit(event)
		}
	}
	
	function windowKey(event: KeyboardEvent) {
		if (event.defaultPrevented) return
		if (event.key === 'Escape' || !isEventMarked(event, popperId)) {
			exit(event)
		}
	}

	function cleanup() {
		if (element && element.isConnected && element.parentElement === document.body) {
			element.parentElement.removeChild(element)
		}

		window.removeEventListener('click', windowClick)
		window.removeEventListener('keydown', windowKey)
	}

	let firstPass = true
	function update(inOptions: OurOptions) {
		options = inOptions ?? {}

		if (firstPass) {
			cleanup()
		}

		const reference = options.reference ?? element.parentElement
		popper = createPopper(reference, element, options)
		window.addEventListener('click', windowClick)
		window.addEventListener('keydown', windowClick)
	}
	
	update(inOptions)
	firstPass = false

	return {
		update,
		destroy() {
			popper?.destroy()
			cleanup()

			element.removeEventListener('click', markAsPopperEvent)
			element.removeEventListener('keydown', markAsPopperEvent)
		}
	}
}
