import { TextDocument, EditorRange, Editor } from 'typewriter-editor'
import { AutocompleteHandler, AutocompleteModule } from './autocompleteModule'
import { WritableStore } from 'common/stores'
import { lineToText } from 'common/typewriterUtils'
import { tick } from 'svelte'

export default class CodeBlockAutocompleter implements AutocompleteHandler {

	autocomplete: AutocompleteModule
	editor: Editor

	options: WritableStore<string[]> = new WritableStore([])
	selectedOption: WritableStore<string> = new WritableStore(null)

	init(autocomplete: AutocompleteModule) {
		this.autocomplete = autocomplete
		this.editor = autocomplete.editor
	}

	canActivateFromTyping(char: string, doc: TextDocument): false | EditorRange {
		if (char === '`') {
			const line = doc.getLineAt(doc.selection[0])
			const lineText = lineToText(line)
			if (lineText === '```' && !line.attributes.code) {
				const start = doc.selection[0]
				tick().then(() => {
					const doc = this.editor.doc
					if (doc.selection[0] !== start) return

					const line = doc.getLineAt(start)
					const lineIndex = doc.lines.indexOf(line)
					const insertion = lineIndex === doc.lines.length - 1
						? '\n```'
						: '```\n'

					this.editor.change
						.insert(start + 1, insertion)
						.select(start)
						.apply()
				})
				return false
			}
		}

		return false
	}

	canActivateByRequest(doc: TextDocument): false | EditorRange {
		throw new Error('Method not implemented.');
	}

	updateSourceText(text: string, doc: TextDocument): boolean {
		throw new Error('Method not implemented.');
	}

	getCurrentOptionText() {
		throw new Error('Method not implemented.');
	}

	shiftSelection(shift: number) {
		throw new Error('Method not implemented.');
	}
}
