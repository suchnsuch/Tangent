import { checkboxMatcher, matchList } from 'common/markdownModel/list';
import { getIndexFromNode, type Editor, type Line } from 'typewriter-editor';
import TangentCheckbox from './NoteEditor/t-checkbox';
import { tick } from 'svelte';
import { type ContextMenuConstructorOptions, appendContextTemplate } from 'app/model/menus'
import type { TodoState } from 'common/indexing/indexTypes'

export default function tCheckboxModule(editor: Editor) {
	function onClick(event: MouseEvent) {
		if (event.defaultPrevented) return

		const checkbox = TangentCheckbox.getTangentCheckboxFromEvent(event)
		if (!checkbox) return

		const doc = editor.doc

		// Find the logical line by way of the line elements index
		const index = getIndexFromNode(editor, checkbox)
		const line = doc.getLineAt(index)
		setCheckboxOnLine(line)
	}

	function onContext(event: MouseEvent) {
		if (event.defaultPrevented) return

		const checkbox = TangentCheckbox.getTangentCheckboxFromEvent(event)
		if (!checkbox) return

		const doc = editor.doc

		// Find the logical line by way of the line elements index
		const index = getIndexFromNode(editor, checkbox)
		const line = doc.getLineAt(index)
		
		let menu: ContextMenuConstructorOptions[] = []

		let state = checkbox.getAttribute('state') as TodoState
		menu.push({
			type: 'radio',
			label: '☑︎ Complete',
			checked: state == 'checked',
			click() {
				setCheckboxOnLine(line, 'checked')
			}
		}, {
			type: 'radio',
			label: '☐ Open',
			checked: state == 'open',
			click() {
				setCheckboxOnLine(line, 'open')
			}
		}, {
			type: 'radio',
			label: '☒ Canceled',
			checked: state == 'canceled',
			click() {
				setCheckboxOnLine(line, 'canceled')
			}
		})

		appendContextTemplate(event, menu)
	}

	function setCheckboxOnLine(line: Line, targetState: TodoState | 'toggle' = 'toggle') {
		const doc = editor.doc

		const lineRange = doc.getLineRange(line)
		const lineText = doc.getText(lineRange)

		const listData = matchList(lineText)
		if (!listData) return

		if (listData.todoState == undefined) return

		const checkMatch = listData.glyph.match(checkboxMatcher)
		if (!checkMatch) return

		const editStart = lineRange[0] + listData.indent.length + checkMatch.index
		const editEnd = editStart + checkMatch[0].length

		const originalSelection = doc.selection
		const change = editor.change.delete([editStart, editEnd])

		switch (targetState) {
			case 'toggle':
				if (checkMatch[1].trim()) {
					// the checkbox was checked
					change.insert(editStart, '[ ]')
				}
				else {
					// the checkbox was not checked
					change.insert(editStart, '[x]')
				}
				break
			case 'open':
				change.insert(editStart, '[ ]')
				break
			case 'checked':
				change.insert(editStart, '[x]')
				break
			case 'canceled':
				change.insert(editStart, '[-]')
				break
		}

		// Manipulating the selection like this causes the page to jump to selection...
		if (originalSelection) {
			change.select(originalSelection)
		}

		// We don't want that, so we cache the current scroll loop...
		let scrolls = new Map<HTMLElement, number>()
		let walker = editor.root
		while (walker) {
			scrolls.set(walker, walker.scrollTop)
			walker = walker.parentElement
		}

		change.apply()

		// ...and then apply it on the next microtick.
		tick().then(() => {
			if (originalSelection) {
				if (document.activeElement !== editor.root) {
					editor.root.focus()
				}
			}
			for (let [element, scroll] of scrolls) {
				element.scrollTop = scroll
			}
		})
	}

	return {
		init() {
			editor.on('click', onClick)
			editor.root.addEventListener('contextmenu', onContext)
		},
		destroy() {
			editor.off('click', onClick)
			editor.root.removeEventListener('contextmenu', onContext)
		},
		setCheckboxOnLine
	}
}
