import { Workspace } from 'app/model'
import { AutocompleteHandler, AutocompleteModule } from './autocompleteModule'
import { Editor, EditorRange, ShortcutEvent, TextDocument, normalizeRange } from 'typewriter-editor'
import { findCharactersBetweenWhiteSpaceAtPositionInDocument, findWordAroundPositionInDocument, lineToText } from 'common/typewriterUtils'
import { WritableStore } from 'common/stores'
import { clamp } from 'common/utils'
import { findCharactersBetweenWhitespace } from 'common/stringUtils'
import { wrappedIndex } from 'common/collections'

type MatcherItem = {
	match: RegExp,
	replace: string|string[],
	mustBeMidLine?: boolean // This is a way to dodge away from `---` markdown formatting collisions
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
	{
		match: /---/,
		replace: [
			'—',
			'–'
		],
		mustBeMidLine: true
	},
	{
		match: /--/,
		replace: [
			'–',
			'—'
		],
		mustBeMidLine: true
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

		const line = doc.getLineAt(selection[0])
		if (line.attributes.code) return false

		// Use the format data of the previous character to "dead recon" this one
		// as the new character will not yet be formatted.
		const formats = doc.getFormats(selection[0] - 1)
		if (formats.inline_code) return false
		
		const [lineStart, lineEnd] = doc.getLineRange(line)
		const lineText = lineToText(line)

		const [wordStart, wordEnd] = findCharactersBetweenWhitespace(lineText, selection[0] - lineStart)
		const text = doc.getText([lineStart + wordStart, lineStart + wordEnd])

		for (const matcher of matches) {
			const match = text.match(matcher.match)
			if (match) {
				if (autoActivate && matcher.mustBeMidLine && wordStart === 0 && match.index === 0) {
					continue
				}
				const start = lineStart + wordStart + match.index
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
		
		index = wrappedIndex(this.options.value, index + shift)

		this.selectedOption.set(this.options.value[index])
	}
}
