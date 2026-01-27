import { type Editor, normalizeRange } from "typewriter-editor"
import { preventArrowNavigate } from "./arrowNavigate"
import { shortcutFromEvent } from "./shortcuts"

export function noArrowNavigate(editor: Editor) {

	function onKeyDown(event: KeyboardEvent) {
		if (event.defaultPrevented || !editor.doc.selection) return
		const [start, end] = normalizeRange(editor.doc.selection)
		const shortcut = shortcutFromEvent(event)
		switch (shortcut) {
			case 'Up':
			case 'Left':
				if (start > 0) preventArrowNavigate(event)
				return
			case 'Down':
			case 'Right':
				if (end < editor.doc.length - 1) preventArrowNavigate(event)
				return
		}
	}

	return {
		init() {
			editor.root.addEventListener('keydown', onKeyDown)
		},
		destroy() {
			editor.root.removeEventListener('keydown', onKeyDown)
		}
	}
}
