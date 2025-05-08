import { isLeftClick } from 'app/utils'
import { rangeIsCollapsed } from 'common/typewriterUtils'
import { Editor } from 'typewriter-editor'

/**
 * Clears selection when clicking into a selection span.
 * This allows you to click inside an existing selection.
 */
export function bustIntoSelection(editor: Editor, event: MouseEvent) {
	const bounds = editor.getBounds(editor.doc.selection)
	if (bounds &&
		bounds.top < event.clientY && bounds.bottom > event.clientY &&
		bounds.left < event.clientX && bounds.right > event.clientX
	) {
		if (!rangeIsCollapsed(editor.doc.selection)) {
			editor.select(null)
		}
	}
}

export function selectionBusterModule(editor: Editor) {
	function onMouseDown(event: MouseEvent) {
		if (isLeftClick(event)) {
			bustIntoSelection(editor, event)
		}
	}

	return {
		init() {
			editor.root.addEventListener('mousedown', onMouseDown)
		},
		destroy() {
			editor.root.removeEventListener('mousedown', onMouseDown)
		}
	}
}
