import { Point } from "common/geometry"
import scrollTo, { type ScrollMargin } from './scrollto'
import { wait } from "@such-n-such/core"

function rectCenter(rect: DOMRect) {
	return Point.make(
		rect.left + rect.width * .5,
		rect.top + rect.height * .5
	)
}

function elementCenter(node: HTMLElement): Point {
	if (document.activeElement === node && node.getAttribute('contenteditable') === 'true') {
		const range = document.getSelection().getRangeAt(0)
		if (range) {
			return rectCenter(range.getBoundingClientRect())
		}
	}

	return rectCenter(node.getBoundingClientRect())
}

function closestEdgePoint(rect: DOMRect, point: Point): Point {
	const result = Point.make(0, 0)

	if (point.x < rect.left) result.x = rect.left
	else if (point.x > rect.right) result.x = rect.right
	else result.x = point.x

	if (point.y < rect.top) result.y = rect.top
	else if (point.y > rect.bottom) result.y = rect.bottom
	else result.y = point.y

	return result
}

function directionFromInput(event: KeyboardEvent) {
	switch (event.key) {
		case 'ArrowLeft':
			return Point.Left
		case 'ArrowRight':
			return Point.Right
		case 'ArrowUp':
			return Point.Up
		case 'ArrowDown':
			return Point.Down
	}
	return null
}

export function isArrowNavigateEvent(event: Event) {
	return (event as any)._isArrowNavigateEvent
}

export function preventArrowNavigate(event: Event) {
	(event as any)._preventArrowNavigate = true
}

function allowArrowNavigate(event: Event) {
	return !event.defaultPrevented && !(event as any)._preventArrowNavigate
}

type DebugDrawConfig = {
	/** The css color of the rectangle */
	color?: string
	/** The time for the debug to show up in ms */
	time?: number
}

type DebugDrawRectConfig = DebugDrawConfig & {
	/** Text to show in the rect */
	text?: string
	/** The size of the text */
	textSize?: string
}

function debugDrawRect(rect: DOMRect, config?: DebugDrawRectConfig) {
	if (!rect) return
	const time = config?.time ?? 1000
	const element = document.createElement('div')

	const color = config?.color ?? 'lime'

	element.style.border = '1px solid ' + color
	element.style.color = color
	element.style.backgroundColor = 'transparent'
	element.style.position = 'fixed'
	element.style.zIndex = '100000'
	element.style.left = rect.left + 'px'
	element.style.top = rect.top + 'px'
	element.style.width = rect.width + 'px'
	element.style.height = rect.height + 'px'

	element.innerText = config?.text ?? ''
	if (config?.textSize) {
		element.style.fontSize = config.textSize
	}

	document.body.appendChild(element)

	setTimeout(() => {
		document.body.removeChild(element)
	}, time)
}

function debugDrawPoint(point: Point, config?: DebugDrawConfig & {
	/** The radius of the point */
	radius?: number
}) {
	if (!point) return
	const time = config?.time ?? 1000
	const element = document.createElement('div')

	const radius = config?.radius ?? 2

	element.style.backgroundColor = config?.color ?? 'lime'
	element.style.borderRadius = `${radius}`
	element.style.position = 'fixed'
	element.style.zIndex = '100000'
	element.style.left = (point.x - radius) + 'px'
	element.style.top = (point.y - radius) + 'px'
	element.style.width = (radius * 2) + 'px'
	element.style.height = (radius * 2) + 'px'

	document.body.appendChild(element)

	setTimeout(() => {
		document.body.removeChild(element)
	}, time)
}

function debugDrawLine(a: Point, b: Point, config?: DebugDrawConfig & {
	/** The width of the line */
	width?: number
}) {
	if (!a || !b) return
	const time = config?.time ?? 1000
	const element = document.createElement('div')

	const min = Point.min(a, b)
	const max = Point.max(a, b)	
	const size = Point.subtract(max, min)

	const width = Math.max(size.x, 10)
	const height = Math.max(size.y, 10)

	element.innerHTML=`
		<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
			<line
				x1="${a.x - min.x}"
				y1="${a.y - min.y}"
				x2="${b.x - min.x}"
				y2="${b.y - min.y}"
				style="stroke:${config?.color ?? 'lime'};stroke-width:${config?.width ?? 1};"
			/>
		</svg>
	`

	element.style.position = 'fixed'
	element.style.zIndex = '100000'
	element.style.left = min.x + 'px'
	element.style.top = min.y + 'px'
	element.style.width = width + 'px'
	element.style.height = height + 'px'

	document.body.appendChild(element)

	setTimeout(() => {
		document.body.removeChild(element)
	}, time)
}

export interface ArrowNavigateOptions {
	/** Selects a container of children to move between */
	containerSelector?: string
	/** Selects a set of elements to move between. If containerSelector is set, this target will be relative to that selector */
	targetSelector?: string

	/** When set, focused elements will have this class automatically added and removed */
	focusClass?: string|string[]
	
	scrollTime?: number
	scrollMarginX?: ScrollMargin
	scrollMarginY?: ScrollMargin
}

export default function arrowNavigate(node: HTMLElement, options?: ArrowNavigateOptions) {

	let container = node
	let focusClasses = (() => {
		if (!options.focusClass) return null
		if (Array.isArray(options.focusClass)) {
			return options.focusClass
		}
		return [options.focusClass]
	})()

	if (options?.containerSelector) {
		container = node.querySelector(options.containerSelector)
	}

	function getTargets() {
		return Array.from(options?.targetSelector
			? container.querySelectorAll(options.targetSelector)
			: container.children)
	}

	function addFocusClasses(target: HTMLElement) {
		if (!focusClasses) return
		for (const focusClass of focusClasses) {
				target.classList.add(focusClass)
			}
	}

	function clearFocusedClasses() {
		if (!focusClasses) return
		for (const target of getTargets()) {
			for (const focusClass of focusClasses) {
				target.classList.remove(focusClass)
			}
		}
	}

	function claimEvent(event: KeyboardEvent) {
		event.preventDefault()
		;(event as any)._isArrowNavigateEvent = true
	}

	function keydown(event: KeyboardEvent) {
		if (!allowArrowNavigate(event)) return
		if (node !== document.activeElement && !node.contains(document.activeElement)) return
		if (!(document.activeElement instanceof HTMLElement)) return
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

		if (event.key === 'Enter') {
			const target = event.target
			// Chromium doesn't like "Enter" for interacting with inputs, frustratingly
			if (target instanceof HTMLSelectElement) {
				claimEvent(event)
				target.showPicker()
				return
			}
			if (target instanceof HTMLInputElement) {
				if (target.type === 'checkbox') {
					claimEvent(event)
					target.checked = !target.checked
					return
				}
			}
			if (target instanceof HTMLButtonElement && focusClasses) {
				// Hack to ensure the 
				wait().then(() => {
					addFocusClasses(target)
				})
				return
			}
		}

		if (event.key === 'Escape') {
			if (document.activeElement != node) {
				clearFocusedClasses()
				node.focus()
				claimEvent(event)
			}
			return
		}

		if (event.target instanceof HTMLInputElement && event.target.type === 'text') {
			const input = event.target
			if (input.selectionStart != input.selectionEnd) return
			if (event.key === 'ArrowLeft' && input.selectionStart > 0) return
			if (event.key === 'ArrowRight' && input.selectionEnd < input.value.length) return
		}

		const direction = directionFromInput(event)
		if (!direction) return

		// Technically, this is always true, since it's derived from keyboard events.
		// This is me unnecessarily making it more complicated for future-proofing.
		// Couldn't resist.
		const isCardinal = (() => {
			const dot = Point.dot(direction, Point.Up)
			function isNearly(value: number, target: number) {
				return Math.abs(value - target) < 0.1
			}
			return isNearly(dot, 1) || isNearly(dot, 0) || isNearly(dot, -1)
		})()

		let best: HTMLElement = null
		let bestPoint: Point = null
		let fallback: HTMLElement = null
		let bestDot = 0
		let bestDistance = Number.MAX_VALUE
		let current = document.activeElement

		const targets = getTargets()

		if (!targets.includes(current) && options?.focusClass) {
			// Attempt to recover the selection
			const found = container.querySelector(`${options?.targetSelector ?? ''}.${options.focusClass}`)
			if (found instanceof HTMLElement) {
				current = found
			}
		}

		const currentPoint = current === node ? Point.make(
			current.offsetLeft, current.offsetTop
		) : elementCenter(current)

		function isBetter(distance: number, dot: number) {
			if (!best) return true
			if (bestDot === dot) return distance < bestDistance
			if (bestDot < dot && distance < bestDistance) return true
			if (bestDot < 1 && Math.abs(dot - bestDot) < .1) return distance < bestDistance
			return false
		}

		for (const target of targets) {
			if (target === current) continue
			if (!(target instanceof HTMLElement)) continue
			if (!fallback) fallback = target

			const targetRect = target.getBoundingClientRect()
			const itemPoint = closestEdgePoint(targetRect, currentPoint)
			const delta = Point.subtract(itemPoint, currentPoint)
			const dirToItem = Point.normalize(delta)
			const dot = Point.dot(direction, dirToItem)
			
			if (dot <= .5) continue

			// When the desire is directly up/down/left/right,
			// heavily emphasize moving along those directions.
			const distance = isCardinal
				? Point.manhattanDistance(currentPoint, itemPoint)
				: Point.distance(currentPoint, itemPoint)

			// Things not aligned with desire should count as "further away"
			const attenuatedDistance = distance / (dot * dot)

			if ((window as any).__debugArrowNavigate) {
				debugDrawRect(targetRect, {
					text: `• ${dot.toFixed(2)} ad ${attenuatedDistance.toFixed(2)}`,
					textSize: '60%'
				})
				debugDrawPoint(itemPoint)
			}

			if (isBetter(distance, dot)) {
				best = target
				bestPoint = itemPoint
				bestDistance = attenuatedDistance
				bestDot = dot
			}
		}

		if (!best) {
			if (current != node && fallback) best = fallback
			else return
		}
		claimEvent(event)

		if (focusClasses) {
			clearFocusedClasses()
			addFocusClasses(best)
		}

		if ((window as any).__debugArrowNavigate) {
			debugDrawLine(currentPoint, bestPoint)
		}

		best.focus({ preventScroll: true })
		scrollTo({
			target: best,
			duration: options?.scrollTime ?? 0,
			marginX: options?.scrollMarginX,
			marginY: options?.scrollMarginY
		})
	}

	function onClick(event: MouseEvent) {
		if (!(event.target instanceof Element)) return

		// Wind up to our immediate child
		let target = event.target
		while (target) {
			if (target.parentElement === container) break
			target = target.parentElement
		}
		if (!target) return

		if (focusClasses) {
			clearFocusedClasses()
			addFocusClasses(target as HTMLElement)
		}
	}

	node.addEventListener('keydown', keydown)
	node.addEventListener('click', onClick)

	return {
		destroy() {
			node.removeEventListener('keydown', keydown)
			node.removeEventListener('click', onClick)
		}
	}
}
