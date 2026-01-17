import { Point } from "common/geometry"
import scrollTo, { type ScrollMargin } from './scrollto'
import { wait } from "@such-n-such/core"

function elementCenter(node: HTMLElement): Point {
	const rect = node.getBoundingClientRect()
	return Point.make(
		rect.left + rect.width * .5,
		rect.top + rect.height * .5
	)
}

function directionFromKey(event: KeyboardEvent) {
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

export interface ArrowNavigateOptions {
	// Selects a container of children to move between
	containerSelector?: string
	// Selects a set of elements to move between. If containerSelector is set, this target will be relative to that selector
	targetSelector?: string

	// When set, focused elements will have this class automatically added and removed
	focusClass?: string
	
	scrollTime?: number
	scrollMarginX?: ScrollMargin
	scrollMarginY?: ScrollMargin
}

export default function arrowNavigate(node: HTMLElement, options?: ArrowNavigateOptions) {

	let container = node

	if (options?.containerSelector) {
		container = node.querySelector(options.containerSelector)
	}

	function getTargets() {
		return Array.from(options?.targetSelector
			? container.querySelectorAll(options.targetSelector)
			: container.children)
	}

	function clearFocused() {
		if (!options?.focusClass) return
		for (const target of getTargets()) {
			target.classList.remove(options.focusClass)
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
			if (target instanceof HTMLButtonElement && options?.focusClass) {
				// Hack to ensure the 
				wait().then(() => {
					target.classList.add(options?.focusClass)
				})
				return
			}
		}

		if (event.key === 'Escape') {
			if (document.activeElement != node) {
				clearFocused()
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

		const direction = directionFromKey(event)
		if (!direction) return

		let best: HTMLElement = null
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

			const itemPoint = elementCenter(target)
			const dirToItem = Point.normalize(Point.subtract(itemPoint, currentPoint))
			const dot = Point.dot(direction, dirToItem)
			
			if (dot <= 0) continue

			const distance = Point.squareDistance(currentPoint, itemPoint) / dot

			if (isBetter(distance, dot)) {
				best = target
				bestDistance = distance
				bestDot = dot
			}
		}

		if (!best) {
			if (current != node && fallback) best = fallback
			else return
		}
		claimEvent(event)

		if (options?.focusClass) {
			clearFocused()
			best.classList.add(options.focusClass)
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
		if (!(event.target instanceof HTMLElement)) return

		// Wind up to our immediate child
		let target = event.target
		while (target) {
			if (target.parentElement === container) break
			target = target.parentElement
		}
		if (!target) return

		if (options?.focusClass) {
			clearFocused()
			target.classList.add(options.focusClass)
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
