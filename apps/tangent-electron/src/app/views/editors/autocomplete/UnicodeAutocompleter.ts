import { Workspace } from 'app/model'
import { AutocompleteHandler, AutocompleteModule } from './autocompleteModule'
import { Editor, EditorRange, ShortcutEvent, TextDocument, normalizeRange } from 'typewriter-editor'
import { findCharactersBetweenWhiteSpaceAtPositionInDocument, findWordAroundPositionInDocument } from 'common/typewriterUtils'
import { WritableStore } from 'common/stores'
import { clamp } from 'common/utils'

type MatcherItem = {
	match: RegExp,
	replace: string|string[],
	autoActivates?: boolean
}

const matches: MatcherItem[] = [
	{
		match: /--+>/,
		replace: [
			'➞',
			'➝',
			'→',
			'⟶',
		]
	},
	{
		match: /->/,
		replace: [
			'→',
			'➝',
			'➞',
			'⟶'
		]
	},
	{
		match: /<--+/,
		replace: [
			'⟵',
			'←'
		]
	},
	{
		match: /<-/,
		replace: [
			'←',
			'⟵'
		]
	},

	// We don't want ndash and mdashes to automatically pop up
	// as that collides _hard_ with the "horizontal rule" markdown syntax
	{
		match: /---/,
		replace: [
			'—',
			'–'
		],
		autoActivates: false
	},
	{
		match: /--/,
		replace: [
			'–',
			'—'
		],
		autoActivates: false
	}
]

const activateChars = '-><'

export default class UnicodeAutocompleter implements AutocompleteHandler {
	workspace: Workspace
	autocomplete: AutocompleteModule
	editor: Editor

	options: WritableStore<string[]> = new WritableStore([])
	selectedOption: WritableStore<string> = new WritableStore(null)

	constructor(workspace: Workspace) {
		this.workspace = workspace
	}

	init(autocomplete: AutocompleteModule) {
		this.autocomplete = autocomplete
		this.editor = autocomplete.editor
	}

	canActivateFromTyping(char: string, doc: TextDocument): false | EditorRange {
		if (activateChars.includes(char)) {
			return this.tryToActivate(doc, true)
		}
		return false
	}

	canActivateByRequest(doc: TextDocument): false | EditorRange {
		return this.tryToActivate(doc)
	}

	tryToActivate(doc: TextDocument, autoActivate=false): false | EditorRange {
		const selection = normalizeRange(doc.selection)
		if (!selection || selection[0] != selection[1]) return false

		const [wordStart, wordEnd] = findCharactersBetweenWhiteSpaceAtPositionInDocument(doc, selection[0])
		const text = doc.getText([wordStart, wordEnd])

		for (const matcher of matches) {
			if (autoActivate && !(matcher.autoActivates ?? true)) {
				continue
			}

			const match = text.match(matcher.match)
			if (match) {
				const start = wordStart + match.index
				const end = start + match[0].length
				return [start, end]
			}
		}

		return false
	}

	updateSourceText(text: string, doc: TextDocument): boolean {
		// Ignore all updates but the first one

		for (const matcher of matches) {
			const match = text.match(matcher.match)
			if (match) {
				if (match.index != 0 || match[0].length < text.length) {
					continue
				}
				if (Array.isArray(matcher.replace)) {
					this.options.set(matcher.replace)	
				}
				else {
					this.options.set([matcher.replace as string])
				}
				this.selectedOption.set(this.options.value[0])
				return true
			}
		}

		return false
	}

	getCurrentOptionText() {
		return this.selectedOption.value ?? ''
	}

	applySelection() {
		this.autocomplete.updateAutocomplete(this.getCurrentOptionText())
	}

	shiftSelection(shift: number) {
		let index = this.options.value.indexOf(this.selectedOption.value)
		if (index < 0) {
			index = 0
		}
		
		index = clamp(index += shift, 0, this.options.value.length - 1)

		this.selectedOption.set(this.options.value[index])
	}
}
