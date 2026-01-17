import { defaultModules, Editor, type EditorOptions, h, normalizeRange, ShortcutEvent } from 'typewriter-editor'
import { selectionBusterModule } from '../selectionBuster'
import { Workspace } from 'app/model'
import UnicodeAutocompleter from '../autocomplete/UnicodeAutocompleter'
import autocompleteWithHandlers from '../autocomplete/autocompleteModule'
import { preventArrowNavigate } from 'app/utils/arrowNavigate'
import { shortcutFromEvent } from 'app/utils/shortcuts'

function noArrowNavigate(editor: Editor) {

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

export default class OneLineEditor extends Editor {
	constructor(workspace: Workspace, options?: EditorOptions) {
		options = options ?? {}

		if (!options.types) {
			options.types = {
				lines: [
					{
						name: 'line',
						selector: 'span.line',
						render: (attributes, children) => {
							return h('span', { className: 'line' }, children)
						}
					}
				]
			}
		}

		if (!options.modules) {
			const {
				copy,
				paste,
				... trimmedDefaultModules
			} = defaultModules

			options.modules = {

				autocomplete: autocompleteWithHandlers([
					new UnicodeAutocompleter(workspace)
				]),
				noArrowNavigate,

				...trimmedDefaultModules,
				copy: editor => copy(editor, { copyPlainText: true }),
				paste: editor => paste(editor, { allowHTMLPaste: false }),
				selectionBusterModule
			}
		}

		super(options)
	}
}
