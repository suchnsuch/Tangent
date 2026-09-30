export function bindInlineSelectionListeners(el: HTMLElement, onClick: (event: MouseEvent) => void) {
	el.addEventListener('click', onClick)
	el.addEventListener('dblclick', onClick)
	el.addEventListener('contextmenu', onClick)
}
