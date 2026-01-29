/*****
 * This file is a grab-bag of direct css class selectors.
 * Falling back to this is _not_ amazing. The document-based ones in particular
 * are incredibly non-portable.
 * 
 * However, they are solving a real problem.
 ****/

export function getDetailsPane(container: HTMLElement): HTMLElement {
	if (!container) return null
	let target = container.querySelector('.details')
	return target instanceof HTMLElement ? target : null
}

export function selectDetailsPane(container: HTMLElement): boolean {
	if (!container) return false
	const details = getDetailsPane(container)
	if (!details) return false

	let target = details.querySelector('.focusable.focused')
	if (!target) target = details.querySelector('.focusable')
	if (target instanceof HTMLElement) {
		target.focus({
			preventScroll: true
		})
		return true
	}
}

export function getLeftSidebarElement() {
	const target = document.querySelector('.sidebar.left')
	if (target instanceof HTMLElement) return target
	return null
}

export function focusLeftSidebar() {
	let target = document.querySelector('.sidebar.left .FileTreeItem.isSelected')
	if (!target) target = document.querySelector('.sidebar.left .FileTreeItem.isParent')
	if (!target) target = document.querySelector('.sidebar.left .FileTreeItem:first-child')
	if (target instanceof HTMLElement) {
		target.focus()
		return true
	}
	return false
}


export function getCurrentMapNode() {
	const mapElement = document.querySelector('.MapsView .MapView.active')
	if (mapElement instanceof HTMLElement) return mapElement
	return null
}
