type PointerEventHandler = (event: PointerEvent) => void

export interface DragOptions {
	move?: PointerEventHandler
	end?: PointerEventHandler
}

export interface DraggingSession {
	stop()
}

let currentSession: DraggingSession = null

export function startDrag(options: DragOptions): DraggingSession {
	const onEnd = function(event: PointerEvent) {
		window.removeEventListener('pointerleave', onEnd)
		window.removeEventListener('pointerup', onEnd)
		
		if (options.end) options.end(event)
		if (options.move) window.removeEventListener('pointermove', options.move)

		currentSession = null
	}

	if (options.move) {
		window.addEventListener('pointermove', options.move)
	}

	window.addEventListener('pointerleave', onEnd, { once: true })
	window.addEventListener('pointerup', onEnd, { once: true })

	currentSession?.stop()

	currentSession = {
		stop: () => onEnd(null)
	}

	return currentSession
}

export function stopDrag() {
	currentSession?.stop()
}
