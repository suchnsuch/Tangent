import { type TextDocument, type EditorRange, normalizeRange } from "typewriter-editor"
import type { AutocompleteHandler, AutocompleteModule } from "./autocompleteModule"
import { lineToText } from "common/typewriterUtils"
import { WritableStore } from "common/stores"
import { templates, type TemplateDefinition } from "common/markdownModel/templates"
import { wrappedIndex } from "common/collections"

export default class TemplateTokenAutocompleter implements AutocompleteHandler {
	
	autocomplete: AutocompleteModule

	options: WritableStore<TemplateDefinition[]> = new WritableStore([])
	selectedOption: WritableStore<TemplateDefinition> = new WritableStore(null)

	init(autocomplete: AutocompleteModule) {
		this.autocomplete = autocomplete
	}

	canActivateFromTyping(char: string, doc: TextDocument): EditorRange | false {
		if (char === '%') {
			return this.canActivateByRequest(doc)
		}
		return false
	}

	canActivateByRequest(doc: TextDocument): EditorRange | false {
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

		const relativeSelection = selection[0] - lineStart

		// Search back
		let index = relativeSelection
		let char = lineText[index]
		let count = 0
		while (index > 0) {
			if (char === '%') count++
			if (count && char === ' ') {
				index++
				char = lineText[index]
				break
			}
			index--
			char = lineText[index]
		}

		if (char != '%') return false

		const start = index
		
		// Search forward
		index = start + 1
		char = lineText[index]
		while (index + 1 < lineText.length && char != '%' && char != ' ') {
			index++
			char = lineText[index]
		}

		let range: EditorRange = null

		if (char == '%') {
			range = [start + lineStart, index + lineStart + 1]
		}
		else if (index + 1 == lineText.length) {
			range = [start + lineStart, index + lineStart + 1]	
		}
		else {
			range = [start + lineStart, index + lineStart]
		}

		if (selection[0] > range[1]) return false

		return range
	}

	updateSourceText(text: string, doc: TextDocument): boolean {

		if (text === '' || text.endsWith(' ')) return false

		let trimmedText = text

		// Strip off of `%` for easy searching
		if (trimmedText[0] === '%') trimmedText = trimmedText.slice(1)
		if (trimmedText.at(-1) === '%') trimmedText = trimmedText.slice(0, -1)

		const upperText = trimmedText.toLocaleUpperCase()

		let list: TemplateDefinition[] = []
		let select: TemplateDefinition = null
		for (const template of templates) {
			if (template.text.toLocaleUpperCase().includes(upperText)
				|| template.description.toLocaleUpperCase().includes(upperText)) {
				list.push(template)
			}
			if (template.text.startsWith(text)) {
				select = template
			}
		}

		// Always show something
		if (!list.length) list = templates

		this.options.set(list)
		this.selectedOption.set(select ?? list[0])

		return true
	}

	getCurrentOptionText() {
		return this.selectedOption.value?.text ?? ''
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
