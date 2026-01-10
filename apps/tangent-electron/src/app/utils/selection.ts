/*****
 * This file is a grab-bag of direct css class selectors.
 * Falling back to this is _not_ amazing. The document-based ones in particular
 * are incredibly non-portable.
 * 
 * However, they are solving a real problem.
 ****/

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
