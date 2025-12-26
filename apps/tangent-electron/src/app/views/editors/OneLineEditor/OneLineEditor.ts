import { defaultModules, Editor, type EditorOptions, h } from 'typewriter-editor'
import { selectionBusterModule } from '../selectionBuster'
import { Workspace } from 'app/model'
import UnicodeAutocompleter from '../autocomplete/UnicodeAutocompleter'
import autocompleteWithHandlers from '../autocomplete/autocompleteModule'

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

				...trimmedDefaultModules,
				copy: editor => copy(editor, { copyPlainText: true }),
				paste: editor => paste(editor, { allowHTMLPaste: false }),
				selectionBusterModule
			}
		}

		super(options)
	}
}
