import { Point } from "common/geometry"
import scrollTo from './scrollto'

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
}

export default function arrowNavigate(node: HTMLElement, options?: Partial<ArrowNavigateOptions>) {

	if (options?.containerSelector) {
		node = node.querySelector(options.containerSelector)
	}

	function keydown(event: KeyboardEvent) {
		if (event.defaultPrevented) return
		if (document.activeElement?.parentElement !== node) return
		if (!(document.activeElement instanceof HTMLElement)) return
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

		const direction = directionFromKey(event)
		if (!direction) return

		let closest: HTMLElement = null
		let closestDistance = Number.MAX_VALUE
		const current = document.activeElement

		const currentPoint = elementCenter(current)
		let child = node.firstElementChild

		for (; child != null; child = child.nextElementSibling) {
			if (child === current) continue
			if (!(child instanceof HTMLElement)) continue

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

		if (!closest) return
		event.preventDefault()
		closest.focus({ preventScroll: true })
		scrollTo({
			target: closest,
			duration: options?.scrollTime ?? 0
		})
	}

	node.addEventListener('keydown', keydown)

	return {
		destroy() {
			node.removeEventListener('keydown', keydown)
		}
	}
}
