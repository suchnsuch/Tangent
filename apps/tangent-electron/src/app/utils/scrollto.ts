import { cubicInOut } from "svelte/easing";
import { loop, now } from "svelte/internal";
import { findParentScrollContainer } from './scrolling';

interface AxisDimensions {
	start: number
	end: number
}

type ScrollMode = 'show' | 'center'
type ScrollMargin = number | AxisDimensions

export interface ScrollToOptions {
	container?: HTMLElement
	x?: number
	y?: number
	target?: number | HTMLElement | DOMRect
	/**
	 * 'show' ensures the target is in view (including margin)
	 * 'center' places the center of the target in the center of the view
	 */
	mode?: ScrollMode
	marginX?: ScrollMargin
	marginY?: ScrollMargin
	// Whether to scroll horizontally (false)
	scrollX?: boolean
	// Whether to scroll vertically (true)
	scrollY?: boolean
	duration?: number
	onDone?: () => void
}

let noOp = () => {}


function boxVerticalAxis(box: DOMRect): AxisDimensions {
	return {
		start: box.top,
		end: box.bottom
	}
}

function boxHorizontalAxis(box: DOMRect): AxisDimensions {
	return {
		start: box.left,
		end: box.right
	}
}

export function marginToAxis(margin: ScrollMargin): AxisDimensions {
	if (typeof margin === 'number') return { start: margin, end: margin }
	return margin
}

function positionForAxis(mode: ScrollMode, scrollPosition: number, container: AxisDimensions, target: AxisDimensions, margin: AxisDimensions) {
	const startToStart = (target.start - margin.start) - container.start
	const endToEnd = (target.end + margin.end) - container.end

	if (startToStart < 0 && endToEnd > 0) {
		// Do nothing, target is too big and is in view
		return scrollPosition
	}
	if (mode === 'show') {
		// Place the start at the start edge (with margin)
		if (startToStart < 0) {
			return scrollPosition + startToStart
		}
		// Or bring the end into view
		// Since an overlarge target is checked for, this will never push the start out of range
		if (endToEnd > 0) {
			return scrollPosition + endToEnd
		}
	}
	else if (mode === 'center') {
		if (target.end - target.start > container.end - container.start) {
			// When the target is too big, just show the start
			return scrollPosition + startToStart
		}
		// Equalize the pull of the start and end axis
		return scrollPosition + (startToStart + endToEnd) * .5
	}

	// Fallback for completeness
	return scrollPosition
}

/**
 * Smoothly scrolls a container to a given location
 * @param options
 * @param options.container The container that will be scrolled
 * @param options.target The element, element index, or domrect to scroll to
 * @param options.marginX The buffer from either horizontal edge
 * @param options.marginY The buffer from either vertical edge
 * @param options.scrollX Whether to scroll hozontally to the element (default false)
 * @param options.scrollY Whether to scroll vertically to the element (default true)
 * @param options.duration How many ms the scroll should take (default 0)
 * @param options.onDone The callback that will occur when the scroll is complete
 * @returns The stop function, or undefined if no scrolling was required
 */
export default function scrollTo(options: ScrollToOptions) {
	let container = options.container

	let targetX: number | undefined = undefined
	let targetY: number | undefined = undefined

	let target = options.target
	let targetBox: DOMRect = null
	if (target != undefined) {
		if (typeof target === 'number') {
			if (!container) {
				console.error('scrollTo() failed. Scroll container must be defined when using a numerical target.')
				return
			}
			target = container.children[target] as HTMLElement
		}
		if (target instanceof HTMLElement) {

			if (!container) {
				container = findParentScrollContainer(target)
			}

			targetBox = target.getBoundingClientRect()
		}
		else {
			targetBox = target
		}
	}

	if (!container) {
		console.warn('scrollTo() failed. Scroll container was not defined and could not be derived from the provided target.')
		return
	}

	const initialX = container.scrollLeft
	const initialY = container.scrollTop

	if (targetBox) {
		
		const containerBox = container.getBoundingClientRect()

		const mode = options.mode ?? 'show'

		if (options.scrollY ?? true) {
			targetY = positionForAxis(
				mode,
				initialY,
				boxVerticalAxis(containerBox),
				boxVerticalAxis(targetBox),
				marginToAxis(options.marginY ?? 0)
			)
		}
		
		if (options.scrollX ?? false) {
			targetX = positionForAxis(
				mode,
				initialX,
				boxHorizontalAxis(containerBox),
				boxVerticalAxis(targetBox),
				marginToAxis(options.marginX ?? 0)
			)
		}
	}

	// Specified x,y should override target.
	// No specification should be the starting values.
	targetX = options.x ?? (targetX ?? initialX)
	targetY = options.y ?? (targetY ?? initialY)

	if (targetX === initialX && targetY === initialY) {
		// No need to move, do not scroll
		return
	}

	const duration = options.duration ?? 0

	if (duration <= 0) {
		container.scrollTop = targetY
		container.scrollLeft = targetX
		return noOp
	}

	const startTime = now()
	const endTime = startTime + duration

	let scrolling = true

	let stop: () => void = null
	let onScroll: (event: WheelEvent) => void = null

	stop = function () {
		scrolling = false
		document.removeEventListener('wheel', onScroll)
	}

	onScroll = function(event) {
		if (event.defaultPrevented) return
		stop()
	}
	
	document.addEventListener('wheel', onScroll)

	function tick(t: number) {
		container.scrollTop = initialY + (targetY - initialY) * t
		container.scrollLeft = initialX + (targetX - initialX) * t
	}

	// A bit of a hack, but prevents issues/boiler plate with taking over scrolling
	if ((container as any).__scrollStop) {
		(container as any).__scrollStop()
	}
	(container as any).__scrollStop = stop

	loop(now => {
		if (scrolling) {
			if (now >= endTime) {
				tick(1)
				stop()
			}
			else {
				tick(cubicInOut((now - startTime) / duration))
			}
		}

		if (!scrolling) {
			if (options.onDone) options.onDone()
		}

		return scrolling
	})

	tick(0)

	return stop
}
