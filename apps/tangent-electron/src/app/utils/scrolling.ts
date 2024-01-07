export function findParentScrollContainer(element: HTMLElement): HTMLElement {
	let walker = element.parentElement
	while (walker) {
		if (walker.scrollHeight > walker.getBoundingClientRect().height + 10) {
			// Found a scrollable
			return walker
		}
		walker = walker.parentElement
	}

	return null
}
