/**
 * Wires the click-family listeners shared by hidden-group inline custom
 * elements (t-math, t-furigana) so both route the same set of events to a
 * single `onClick` handler.
 */
export function bindInlineSelectionListeners(el: HTMLElement, onClick: (event: MouseEvent) => void) {
	el.addEventListener('click', onClick)
	el.addEventListener('dblclick', onClick)
	el.addEventListener('contextmenu', onClick)
}
