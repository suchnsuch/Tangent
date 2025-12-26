import { tagNameSeperatorMatch, tokenizeTagName } from '@such-n-such/tangent-query-parser';
import type { Workspace } from 'app/model';
import { matchTag, type TagDefinition } from 'common/markdownModel/tag';
import { buildMatcher, orderTreeNodesForSearch, type SearchMatchResult } from 'common/search';
import { rangeContainsRange } from 'common/typewriterUtils';
import { WritableStore } from 'common/stores'
import { TextDocument, type EditorRange, Editor, normalizeRange, ShortcutEvent } from 'typewriter-editor';
import type { AutocompleteHandler, AutocompleteModule } from './autocompleteModule';
import { iterateOverChildren } from 'common/trees';
import type { TagTreeNode } from 'common/indexing/TagNode';
import { wrappedIndex } from 'common/collections';

export type TagOption = {
	node: TagTreeNode,
	match: SearchMatchResult
}

export type TagAutocompleterOptions = {
	includeTrailingSpace?: boolean
}

export default class TagAutocompleter implements AutocompleteHandler {

	workspace: Workspace
	options: TagAutocompleterOptions
	autocomplete: AutocompleteModule
	editor: Editor

	cachedActivationPosition: number = null

	baseNames = new WritableStore<string[]>([])
	tagOptions = new WritableStore<TagOption[]>([])
	selectedOption = new WritableStore<TagOption>(null)
	selectedTagIndex = new WritableStore(0)
	activeNameIndex = new WritableStore(0)

	text = new WritableStore<string>(null)
	seperatorChar = '/'

	constructor(workspace: Workspace, options?: TagAutocompleterOptions) {
		this.workspace = workspace
		this.options = options ?? {}
	}

	init(autocomplete: AutocompleteModule) {
		this.autocomplete = autocomplete
		this.editor = autocomplete.editor
	}

	canActivateFromTyping(char: string, doc: TextDocument): false | EditorRange {
		if (this.cachedActivationPosition != null) {
			const [start, end] = doc.selection
			if ((this.cachedActivationPosition === start - 2)
				&& !char.match(/\s|#/)) {
				this.cachedActivationPosition = null
				return [start - 2, end]
			}
		}
		else if (char === '#') {
			const [start, end] = doc.selection
			const lastChar = doc.getText([start - 2, start - 1])
			if (!lastChar || lastChar.match(/\s/)) {
				this.cachedActivationPosition = start - 1
				return false
			}
		}
		this.cachedActivationPosition = null
		return false
	}

	canActivateByRequest(doc: TextDocument): false | EditorRange {
		const selection = normalizeRange(doc.selection)
		const lines = doc.getLinesAt(selection)
		if (lines.length !== 1) return false
		const line = lines[0]
		const lineRange = doc.getLineRange(line)
		const text = doc.getText(lineRange)

		let textIndex = 0
		while (textIndex < text.length) {
			const tagDefinition = matchTag(text.substring(textIndex))
			if (!tagDefinition) break

			const start = lineRange[0] + textIndex + tagDefinition.start
			const matchRange = [start, start + tagDefinition.length] as EditorRange
			if (rangeContainsRange(matchRange, selection)) {
				return matchRange
			}
			else {
				textIndex += tagDefinition.start + tagDefinition.length
			}
		}

		// Normal matching failed, try once more
		if (doc.getText([selection[0] - 2, selection[0]]).match(/(?:^|\s)#/)) {
			return [selection[0] - 1, selection[1]]
		}

		return false
	}

	matchTagSpecial(text: string): TagDefinition {
		if (text === '#') {
			// Special case for an unfinished tag
			return {
				start: 0,
				length: 1,
				names: []
			}
		}
		return matchTag(text)
	}
	
	updateSourceText(text: string, doc: TextDocument): boolean {
		this.text.set(text)
		const tag = this.matchTagSpecial(text)
		if (!tag) return false
		if (tag.start > 0) return false // e.g. inserting a space at the start

		// Ensure text is only ever the length of a single trailing seperator
		if (text.length > tag.length) {
			if (text.length - tag.length > 1) return false
			if (text[text.length - 1].match(tagNameSeperatorMatch) === null) return false
		}
		
		const [textStart, textEnd] = this.autocomplete.range.value
		const [selectionStart, selectionEnd] = normalizeRange(doc.selection)
		
		const relativeStart = selectionStart - textStart

		// Find which name section the selection is in
		let characterIndex = 1 // Start after the initial #
		let nameIndex = 0
		let baseNames: string[] = []

		for (; nameIndex < tag.names.length; nameIndex++) {
			const name = tag.names[nameIndex]
			const next = characterIndex + name.length + 1
			if (next > relativeStart) {
				break
			}
			else {
				baseNames.push(name)
				characterIndex = next
			}
		}

		this.activeNameIndex.set(nameIndex)

		this.baseNames.set(baseNames)
		
		const searchText = text.substring(1).replace(/\./g, '/')
		const searchMatcher = buildMatcher(searchText, { fuzzy: true })
		const store = this.workspace.directoryStore

		let nodes: TagOption[] = null

		if (searchText) {
			nodes = store.getMatchesForPath(searchMatcher, {
				fuzzy: true,
				root: store.tags,
				includeMatches: 'all'
			}) as TagOption[]
		}
		else {
			nodes = [...iterateOverChildren(store.tags)].map(node => ({
				node, match: undefined
			})) as TagOption[]
		}
		nodes.sort((a, b) => orderTreeNodesForSearch(a, b, false))

		if (!searchText) {
			nodes = nodes.slice(0, 10)
		}

		this.tagOptions.set(nodes)

		const lastValue = this.selectedOption.value
		const foundIndex = lastValue ? nodes.findIndex(i => i.node === lastValue.node) : -1
		this.setSelection(foundIndex)

		return true
	}

	getCurrentOptionText() {
		const item = this.selectedOption.value
		if (item) {
			const tagNode = item.node as TagTreeNode
			return '#' + tagNode.names.join(this.seperatorChar)
		}
		return this.text.value
	}

	setSelection(value: number | TagOption) {
		const options = this.tagOptions.value
		if (typeof value === 'number') {
			if (options.length === 0) {
				this.selectedTagIndex.set(-1)
				this.selectedOption.set(null)
				return
			}

			let newIndex = value
			if (newIndex < 0) {
				newIndex = 0
			}
			else if (newIndex >= options.length) {
				newIndex = options.length - 1
			}
			
			this.selectedTagIndex.set(newIndex)
			this.selectedOption.set(options[newIndex])
		}
		else {
			const foundIndex = options.indexOf(value)
			if (foundIndex >= 0) {
				this.setSelection(foundIndex)
			}
			else {
				this.setSelection(0)
			}
		}
	}

	shiftSelection(shift: number) {
		this.setSelection(wrappedIndex(this.tagOptions.value, this.selectedTagIndex.value + shift))
	}

	applyAndFullExit() {
		let finalText = this.getCurrentOptionText()
		if (this.options.includeTrailingSpace ?? true) {
			finalText += ' '
		}
		this.autocomplete.updateAutocomplete(finalText)
		this.autocomplete.endAutocomplete()
	}

	onKeyDown?(event: ShortcutEvent) {
		if (event.modShortcut === 'Enter') {
			this.applyAndFullExit()
			event.preventDefault()
		}
		else if (event.modShortcut === 'Tab') {
			this.autocomplete.updateAutocomplete(this.getCurrentOptionText())
			event.preventDefault()
		}
		else if (event.modShortcut === '/' || event.modShortcut === '.') {
			// Approve the current name index and add a separator
			this.seperatorChar = event.modShortcut

			const text = this.getCurrentOptionText()
			const names = tokenizeTagName(text)

			const nameIndex = this.activeNameIndex.value
			let result = ''
			for (let i = 0; i <= nameIndex; i++) {
				result += names[i] + this.seperatorChar
			}

			this.autocomplete.updateAutocomplete(result)

			event.preventDefault()
		}
		else if (event.modShortcut === 'Mod+\\') {
			event.preventDefault()
			const editor = this.autocomplete.editor
			const doc = editor.doc
			const [start, end] = doc.selection

			editor.change
				.insert(this.autocomplete.range.value[0], '\\')
				.select([start + 1, end + 1])
				.apply()

			this.autocomplete.endAutocomplete()
		}
	}

	onEnd?() {
		this.selectedTagIndex.set(0)
		this.selectedOption.set(null)	
	}
}
