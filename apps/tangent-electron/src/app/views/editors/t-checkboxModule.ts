import { checkboxMatcher, matchList } from 'common/markdownModel/list';
import type { Editor, Line } from 'typewriter-editor';
import TangentCheckbox from './NoteEditor/t-checkbox';

export default function tCheckboxModule(editor: Editor) {
	function onClick(event: MouseEvent) {
		if (event.defaultPrevented) return

		const checkbox = TangentCheckbox.getTangentCheckboxFromEvent(event)
		if (!checkbox) return

		const doc = editor.doc

		// Find the logical line by way of the line elements index
		const lineElement = checkbox.closest('.line')
		const parent = lineElement.parentElement;
		const index = Array.prototype.indexOf.call(parent.children, lineElement)
		
		const line = doc.lines[index]
		toggleCheckboxOnLine(line)
	}

	function toggleCheckboxOnLine(line: Line) {
		const doc = editor.doc

		const lineRange = doc.getLineRange(line)
		const lineText = doc.getText(lineRange)

		const listData = matchList(lineText)
		if (!listData) return

		if (listData.checked == undefined) return

		const checkMatch = listData.glyph.match(checkboxMatcher)
		if (!checkMatch) return

		const editStart = lineRange[0] + listData.indent.length + checkMatch.index
		const editEnd = editStart + checkMatch[0].length

		const originalSelection = doc.selection
		const change = editor.change.delete([editStart, editEnd])

		if (checkMatch[1].trim()) {
			// the checkbox was checked
			change.insert(editStart, '[ ]')
		}
		else {
			// the checkbox was not checked
			change.insert(editStart, '[x]')
		}

		if (originalSelection) {
			change.select(originalSelection)
		}

		change.apply()

		if (originalSelection) {
			if (document.activeElement !== editor.root) {
				editor.root.focus()
			}
		}
	}

	return {
		init() {
			editor.on('click', onClick)
		},
		destroy() {
			editor.off('click', onClick)
		},
		toggleCheckboxOnLine
	}
}
