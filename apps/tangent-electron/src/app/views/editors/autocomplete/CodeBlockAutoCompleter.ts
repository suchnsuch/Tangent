import { TextDocument, EditorRange, Editor } from 'typewriter-editor'
import { AutocompleteHandler, AutocompleteModule } from './autocompleteModule'
import { WritableStore } from 'common/stores'
import { lineToText } from 'common/typewriterUtils'
import { tick } from 'svelte'
import { SearchMatchResult, buildFuzzySegementMatcher, compareNodeSearch } from 'common/search'
import { clamp } from 'common/utils'
import { getLanguageAliases } from 'common/markdownModel/codeSyntax'
import { wrappedIndex } from 'common/collections'

export interface CodeBlockLanguageAutocompleteItem {
	language: string
	match: SearchMatchResult
}

export default class CodeBlockAutocompleter implements AutocompleteHandler {

	autocomplete: AutocompleteModule
	editor: Editor

	options: WritableStore<CodeBlockLanguageAutocompleteItem[]> = new WritableStore([])
	selectedOption: WritableStore<CodeBlockLanguageAutocompleteItem> = new WritableStore(null)

	init(autocomplete: AutocompleteModule) {
		this.autocomplete = autocomplete
		this.editor = autocomplete.editor
	}

	canActivateFromTyping(char: string, doc: TextDocument): false | EditorRange {
		if (char === '`') {
			// Add a closing line for the code block
			// This isn't _quite_ autocomplete territory, but it's close.
			const line = doc.getLineAt(doc.selection[0])
			const lineText = lineToText(line)
			if (lineText === '```' && !line.attributes.code) {
				const start = doc.selection[0]
				// Delay execution so that the subsequent change can be undone.
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

		return this.canActivateByRequest(doc)
	}

	canActivateByRequest(doc: TextDocument): false | EditorRange {
		const line = doc.getLineAt(doc.selection[0])
		if (!line.attributes.code) return false
		if (!line.content.ops.length) return false
		if (!line.content.ops[0].attributes?.start) return false

		const lineText = lineToText(line)
		const match = lineText.match(/^```(\w+)$/)
		if (match) {
			const [start, end] = doc.getLineRange(line)
			return [start + 3, end - 1]
		}
		
		return false
	}

	updateSourceText(text: string, doc: TextDocument): boolean {

		const matcher = buildFuzzySegementMatcher(text, false)

		const result: CodeBlockLanguageAutocompleteItem[] = []

		if (!text) return false

		for (const [alias, language] of getLanguageAliases()) {
			const match = alias.match(matcher)
			if (match) {
				result.push({
					language: alias,
					match
				})
			}
		}

		result.sort((a, b) => compareNodeSearch(a.match, b.match))

		this.options.set(result)
		this.selectedOption.set(result[0])

		return true
	}

	getCurrentOptionText() {
		return this.selectedOption.value.language
	}

	applySelection() {
		this.autocomplete.updateAutocomplete(this.getCurrentOptionText())
	}

	shiftSelection(shift: number) {
		let index = this.options.value.indexOf(this.selectedOption.value)
		if (index < 0) {
			index = 0
		}
		
		index = wrappedIndex(this.options.value, index + shift)

		this.selectedOption.set(this.options.value[index])
	}
}
