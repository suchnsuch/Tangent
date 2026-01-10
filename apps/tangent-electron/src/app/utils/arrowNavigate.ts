import { Point } from "common/geometry"
import scrollTo, { type ScrollMargin } from './scrollto'

function elementCenter(node: HTMLElement): Point {
	return Point.make(
		node.offsetLeft + node.offsetWidth * .5,
		node.offsetTop + node.offsetWidth * .5
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

export interface ArrowNavigateOptions {
	containerSelector: string
	scrollTime: number
	focusClass: string

	scrollMarginX: ScrollMargin
	scrollMarginY: ScrollMargin
}

export default function arrowNavigate(node: HTMLElement, options?: Partial<ArrowNavigateOptions>) {

	let container = node

	if (options?.containerSelector) {
		container = node.querySelector(options.containerSelector)
	}

	function clearFocused() {
		if (!options?.focusClass) return
		for (let i = 0; i < container.children.length; i++) {
			container.children[i].classList.remove(options.focusClass)
		}
	}

	function keydown(event: KeyboardEvent) {
		if (event.defaultPrevented) return
		if (node !== document.activeElement && !node.contains(document.activeElement)) return
		if (!(document.activeElement instanceof HTMLElement)) return
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

		if (event.key === 'Escape') {
			if (document.activeElement != node) {
				clearFocused()
				node.focus()
				event.preventDefault()
			}
			return
		}

		console.log(event)

		const direction = directionFromKey(event)
		if (!direction) return

		let closest: HTMLElement = null
		let fallback: HTMLElement = null
		let closestDistance = Number.MAX_VALUE
		let current = document.activeElement

		if (current.parentElement != container && options?.focusClass) {
			// Attempt to recover the selection
			const found = container.querySelector('.' + options.focusClass)
			if (found instanceof HTMLElement) {
				current = found
			}
		}

		const currentPoint = current === node ? Point.make(
			current.offsetLeft, current.offsetTop
		) : elementCenter(current)
		let child = container.firstElementChild

		for (; child != null; child = child.nextElementSibling) {
			if (child === current) continue
			if (!(child instanceof HTMLElement)) continue
			if (!fallback) fallback = child

			const itemPoint = elementCenter(child)
			const dirToItem = Point.normalize(Point.subtract(itemPoint, currentPoint))
			const dot = Point.dot(direction, dirToItem)
			
			if (dot < .5) continue

			const distance = Point.squareDistance(
				currentPoint,
				itemPoint)
			
			if (!closest || distance < closestDistance) {
				closest = child
				closestDistance = distance
			}
		}

		if (!closest) {
			if (current != node && fallback) closest = fallback
			else return
		}
		event.preventDefault()

		if (options?.focusClass) {
			clearFocused()
			closest.classList.add(options.focusClass)
		}

		closest.focus({ preventScroll: true })
		scrollTo({
			target: closest,
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
