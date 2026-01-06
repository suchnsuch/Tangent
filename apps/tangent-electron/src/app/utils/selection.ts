export function selectDetailsPane(container: HTMLElement): boolean {
	if (!container) return false
	const target = container.querySelector('.details .focusable')
	if (target instanceof HTMLElement) {
		target.focus({
			preventScroll: true
		})
		return true
	}
}
