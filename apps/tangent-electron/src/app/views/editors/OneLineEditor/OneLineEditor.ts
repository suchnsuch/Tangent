import { defaultModules, Editor, EditorOptions, h } from 'typewriter-editor'

export default class OneLineEditor extends Editor {
	constructor(options?: EditorOptions) {
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
				...trimmedDefaultModules,
				copy: editor => copy(editor, { copyPlainText: true }),
				paste: editor => paste(editor, { allowHTMLPaste: false })
			}
		}

		super(options)
	}
}
