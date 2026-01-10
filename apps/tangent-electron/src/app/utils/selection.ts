export function selectDetailsPane(container: HTMLElement): boolean {
	if (!container) return false
	let target = container.querySelector('.details .focusable.focused')
	if (!target) target = container.querySelector('.details .focusable')
	if (target instanceof HTMLElement) {
		target.focus({
			preventScroll: true
		})
		return true
	}
}
