import type Workspace from "app/model/Workspace";
import { TextDocument, EditorRange, Editor, normalizeRange, ShortcutEvent } from "typewriter-editor";
import type { AutocompleteHandler, AutocompleteModule } from "./autocompleteModule";
import { iterateOverChildren, TreeNode, TreePredicate, TreePredicateResult } from 'common/trees'
import { WritableStore } from 'common/stores'
import { matchWikiLink, wikiLinkMatcher } from 'common/markdownModel/links'
import { HeaderInfo, IndexData } from "common/indexing/indexTypes";
import { safeHeaderLine } from "common/markdownModel/header";
import { rangeContainsRange } from 'common/typewriterUtils';
import { EmbedType, getEmbedType } from 'common/embedding';
import { buildFuzzySegementMatcher, buildMatcher, orderTreeNodesForSearch, SegmentSearchNodePair, SearchMatchResult } from 'common/search';
import { implicitExtensionsMatch } from 'common/fileExtensions';
import paths, { normalizeSeperators } from "common/paths";

export interface WikiLinkAutocompleteNodeItem {
	node: TreeNode
	match: SearchMatchResult
}

export interface WikiLinkAutocompleteContentItem {
	header: HeaderInfo
	match: SearchMatchResult
}

export interface WikiLinkAutocompleterOptions {
	enableContent: boolean
	enableText: boolean
	enableEmbedding: boolean
}

const defaultOptions: WikiLinkAutocompleterOptions = {
	enableContent: true,
	enableText: true,
	enableEmbedding: true
}

export function showFileType(fileType: string) {
	return !fileType.match(implicitExtensionsMatch)
}

export default class WikiLinkAutocompleter implements AutocompleteHandler {

	workspace: Workspace
	autocomplete: AutocompleteModule
	editor: Editor

	options: WikiLinkAutocompleterOptions

	text: string
	pathText: WritableStore<string> = new WritableStore(null)
	contentText: WritableStore<string> = new WritableStore(null)
	linkText: WritableStore<string> = new WritableStore(null)

	isEmbed: WritableStore<boolean> = new WritableStore(false)
	mode: WritableStore<'node'|'content'|'text'> = new WritableStore('node')

	nodeOptions: WritableStore<WikiLinkAutocompleteNodeItem[]> = new WritableStore([])
	selectedNode: WritableStore<WikiLinkAutocompleteNodeItem> = new WritableStore(null)
	_selectedNodeIndex: number = 0

	contentOptions: WritableStore<WikiLinkAutocompleteContentItem[]> = new WritableStore([])
	selectedContent: WritableStore<HeaderInfo> = new WritableStore(null)
	_selectedContentIndex: number = 0

	private _nodeFilter: TreePredicate

	constructor(workspace: Workspace, options?: Partial<WikiLinkAutocompleterOptions>) {
		this.workspace = workspace
		this.options = { ...defaultOptions, ...(options ?? {}) }
		this._nodeFilter = this.nodeFilter.bind(this)

		this.isEmbed.subscribe(embed => this.onPathText(this.pathText.value))
		this.pathText.subscribe(pathText => this.onPathText(pathText))
		this.contentText.subscribe(contentText => this.onContentText(contentText))
	}

	init(autocomplete: AutocompleteModule) {
		this.autocomplete = autocomplete
		this.editor = autocomplete.editor
	}

	canActivateFromTyping(char: string, doc: TextDocument): false | EditorRange {
		if (char === '[') {
			const s = doc.selection
			const lastChar = doc.getText([s[0] - 2, s[0] - 1])
			if (lastChar === '[') {
				return [s[0] - 2, s[1]]
			}
		}
		return false
	}

	canActivateByRequest(doc: TextDocument): false | EditorRange {

		const selection = normalizeRange(doc.selection)
		const lines = doc.getLinesAt(selection)
		if (lines.length === 1) {
			const line = lines[0]
			const lineRange = doc.getLineRange(line)
			
			const text = doc.getText(lineRange)

			let textIndex = 0
			while (textIndex < text.length) {
				const match = text.substr(textIndex).match(wikiLinkMatcher)
				if (!match) break

				const start = match.index + textIndex
				const matchRange = [lineRange[0] + start, lineRange[0] + start + match[0].length] as EditorRange
				if (rangeContainsRange(matchRange, selection)) {

					return matchRange
				}
				else {
					textIndex += match.index + match[0].length
				}
			}
		}
 
		return false
	}

	nodeFilter(node: TreeNode) {
		if (node.name.startsWith('.')) {
			return TreePredicateResult.Ignore
		}
		if (node.fileType === 'folder') {
			return TreePredicateResult.Include
		}
		if (node === this.workspace.viewState.tangent.currentNode.value) {
			return TreePredicateResult.OnlyIncludeChildren
		}
		if (this.isEmbed.value && getEmbedType(node) === EmbedType.Invalid) {
			return TreePredicateResult.Ignore
		}
		return TreePredicateResult.Include
	}

	updateSourceText(text: string, doc: TextDocument): boolean {
		this.text = text
		const link = matchWikiLink(text, 0, {
			allowIncomplete: true,
			snipFormatCharacters: false
		})
		if (link) {
			// Check if this is an embed
			const range = this.autocomplete.range.value
			if (range[0] > 0) {
				this.isEmbed.set(doc.getText([range[0] - 1, range[0]]) === '!')
			}

			// Update the text values, invoking the subscribed option updaters
			this.pathText.value = link.href

			// Correct for the current node
			if (!this.pathText.value && link.content_id) {
				this.selectedNode.set({
					node: this.currentTangentNode,
					match: undefined
				})
			}

			this.contentText.value = link.content_id || null
			this.linkText.value = link.text || null
			
			// Update the mode
			const contentIndex = text.indexOf('#')
			const textIndex = text.indexOf('|')
			if (doc.selection) {
				const [selectionStart, selectionEnd] = doc.selection
				const cursor = selectionStart - range[0]
				if (this.options.enableText && textIndex >= 0 && cursor > textIndex) {
					this.mode.set('text')
				}
				else if (this.options.enableContent && contentIndex >= 0 && cursor > contentIndex) {
					this.mode.set('content')
				}
				else {
					this.mode.set('node')
				}
			}
			else {
				this.mode.set('node')
			}
			
			// If the match has closed
			if (link.complete) {
				if (range[1] - range[0] > link.end - link.start) {
					// If the range has moved beyond the closing brackets,
					// exit autocomplete
					return false
				}
			}
		}
		return link !== null
	}

	getCurrentOptionText(hard: boolean = true) {
		let result = '[['
		
		const mode = this.mode.value
		let pathText = null
		const selectedNode = this.selectedNode.value
		if (!hard && mode === 'node' || !selectedNode){
			pathText = this.pathText.value
		}
		else if (selectedNode.node === this.currentTangentNode) {
			pathText = ''
		}
		else if (selectedNode) {
			pathText = this.workspace.directoryStore.getPathToItem(selectedNode.node, {
				includeExtension: showFileType,
				length: 'short'
			})
		}
		result += pathText

		if (!hard && mode === 'content') {
			this.contentText.ifHasValue(v => result += v)
		}
		else {
			this.selectedContent.ifHasValue(v => result += '#' + safeHeaderLine(v.text))
		}

		if (this.linkText.value) {
			result += this.linkText.value
		}
		else {
			const match = selectedNode?.match
			if (match) {
				let relativePath = this.workspace.directoryStore.pathToRelativePath(selectedNode.node.path)
				// Enforce `/` delimited paths
				if (relativePath) relativePath = normalizeSeperators(relativePath, '/')
				
				if (match.input !== relativePath && match.input !== selectedNode.node.path) {
					// This matched to an alias
					// Strip out any path information that was presented with the alias.
					result += '|' + paths.basename(match.input)
				}
			}
		}

		result += ']]'

		return result
	}

	onPathText(pathText: string) {
		let nodes: SegmentSearchNodePair[] = null
		let searchMatcher = buildMatcher(pathText, { fuzzy: true })
		const store = this.workspace.directoryStore
		if (pathText) {
			nodes = store.getMatchesForPath(searchMatcher, {
				fuzzy: true,
				root: store.files,
				orderByDistance: true,
				alwaysReturnArray: true,
				includeMatches: 'all',
				filter: this._nodeFilter
			})
		}
		else {
			nodes = [...iterateOverChildren(store.files, this._nodeFilter)].map(node => ({
				node, match: undefined
			}))
		}
		nodes.sort(orderTreeNodesForSearch)
		if (!pathText) {
			nodes = nodes.slice(0, 10)
		}

		this.nodeOptions.set(nodes)
	
		// Reset selected index; values have changed
		this.selectedNodeIndex = 0
	}

	onContentText(contentText: string) {
		let options: WikiLinkAutocompleteContentItem[] = []
		const selectedNode = this.selectedNode.value
		if (selectedNode && contentText) {
			let searchMatcher = buildFuzzySegementMatcher(contentText.substring(1))

			for (let header of IndexData.headers(selectedNode.node.meta)) {
				const match = header.text.match(searchMatcher)
				if (match) {
					options.push({
						header,
						match
					})
				}
			}
		}
		this.contentOptions.set(options)
		this.selectedContentIndex = 0
	}

	shiftSelection(shift: number) {
		const options = this.currentOptions
		if (!options) return

		const shiftedIndex = this.currentSelectedIndex + shift
		if (shiftedIndex < 0) {
			this.currentSelectedIndex = 0
		}
		else if (shiftedIndex >= options.value.length) {
			this.currentSelectedIndex = options.value.length - 1
		}
		else {
			this.currentSelectedIndex = shiftedIndex
		}
	}

	get currentOptions() {
		switch(this.mode.value) {
			case 'node':
				return this.nodeOptions
			case 'content':
				return this.contentOptions
			case 'text':
				return null
		}
	}

	get currentSelectedIndex() {
		switch(this.mode.value) {
			case 'node':
				return this.selectedNodeIndex
			case 'content':
				return this.selectedContentIndex
			case 'text':
				return 0
		}
	}

	set currentSelectedIndex(value) {
		switch(this.mode.value) {
			case 'node':
				this.selectedNodeIndex = value
				break
			case 'content':
				this.selectedContentIndex = value
				break
			case 'text':
				break
		}
	}

	setSelectedNode(option: WikiLinkAutocompleteNodeItem) {
		let index = this.nodeOptions.value.indexOf(option)
		this.selectedNodeIndex = index >= 0 ? index : 0
	}

	applySelection(hard=true) {
		this.autocomplete.updateAutocomplete(this.getCurrentOptionText(hard))
	}

	applyCurrentText() {
		let text = this.text
		const link = matchWikiLink(this.text, 0, {
			allowIncomplete: true,
			snipFormatCharacters: false
		})
		if (!link.complete) {
			text += ']]'
		}
		this.autocomplete.updateAutocomplete(text)
	}

	end() {
		this.autocomplete.endAutocomplete()
	}

	get selectedNodeIndex() {
		return this._selectedNodeIndex
	}

	set selectedNodeIndex(value: number) {
		this._selectedNodeIndex = value
		if (value >= 0 && value < this.nodeOptions.value.length) {
			this.selectedNode.value = this.nodeOptions.value[value]
		}
		else {
			this.selectedNode.value = null
		}
	}

	get selectedContentIndex() {
		return this._selectedContentIndex
	}

	set selectedContentIndex(value: number) {
		this._selectedContentIndex = value
		if (value >= 0 && value < this.contentOptions.value.length) {
			this.selectedContent.value = this.contentOptions.value[value].header
		}
		else {
			this.selectedContent.value = null
		}
	}

	get currentTangentNode() {
		return this.workspace.viewState.tangent.currentNode.value
	}

	get pathTextRange(): EditorRange {
		const start = this.autocomplete.range.value[0] + 2
		return [start, start + this.pathText.value.length]
	}

	get contentTextRange(): EditorRange {
		const start = this.pathTextRange[1]
		return [start, start + (this.contentText.value?.length || 0)]
	}

	get linkTextRange(): EditorRange {
		const start = this.contentTextRange[1]
		return [start, start + (this.linkText.value?.length || 0)]
	}

	onKeyDown(event: ShortcutEvent) {
		// TODO: Make this configurable
		if (event.modShortcut === 'Ctrl+Space') {
			// Select all of the inner-link text
			const doc = this.autocomplete.editor.doc
			const range = this.autocomplete.range.value

			const text = doc.getText(range)
			let nextSelection = range.slice() as EditorRange

			if (text.startsWith('[[')) {
				nextSelection[0] = nextSelection[0] + 2
			}
			if (text.endsWith(']]')) {
				nextSelection[1] = nextSelection[1] - 2
			}

			this.autocomplete.editor.change.select(nextSelection).apply()

			event.preventDefault()
			return
		}

		if (event.modShortcut === 'Mod+Enter') {
			// Apply the selection and don't consume the event so that navigation
			// can occur
			this.applySelection()
			this.end()
			return
		}

		if (event.modShortcut === 'Shift+Enter') {
			// Drop out of auto-complete, but close the brackets
			this.applyCurrentText()
			this.end()
			event.preventDefault()
			return
		}

		if (!event.ctrlKey && !event.metaKey && !event.altKey) {
			if (event.key === 'Tab') {
				let [selectionStart, selectionEnd] = normalizeRange(this.editor.doc.selection)
				let [initialRangeStart, initialRangeEnd] = this.autocomplete.range.value
				const initialMode = this.mode.value
				const direction = event.shiftKey ? -1 : 1

				this.applySelection()

				const modes = ['node', 'content', 'text']
				const ranges = [this.pathTextRange, this.contentTextRange, this.linkTextRange]

				const startIndex = modes.indexOf(initialMode)
				let nextIndex = startIndex + direction
				if (selectionStart < initialRangeStart + 2) {
					nextIndex = 0
				}
				else if (selectionEnd > initialRangeEnd - 2) {
					nextIndex = modes.length - 1
				}

				let targetRange: EditorRange = null

				while (targetRange === null && nextIndex >= 0 && nextIndex < modes.length) {
					const range = ranges[nextIndex]
					if (range[0] !== range[1]) {
						targetRange = range
					}
					else {
						nextIndex += direction
					}
				}

				if (targetRange) {
					// Select the next component
					this.editor.select([
						targetRange[0] + (nextIndex > 0 ? 1 : 0), // Shave formatting
						targetRange[1]
					])
				}
				else {
					let [rangeStart, rangeEnd] = this.autocomplete.range.value
					// Exit in the appropriate direction
					if (direction > 0) {
						if (initialRangeEnd === rangeEnd && selectionEnd >= initialRangeEnd - 2) {
							this.editor.select(rangeEnd)
						}
						else {
							this.editor.select(rangeEnd - 2)
						}
					}
					else {
						if (selectionStart <= initialRangeStart + 2) {
							this.editor.select(rangeStart)
						}
						else {
							this.editor.select(rangeStart + 2)
						}
					}
				}
				event.preventDefault()
			}
			if (event.key === '#' && this.options.enableContent) {
				if (!this.contentText.value) {
					this.contentText.value = '#'

					if (!this.pathText.value) {
						this.selectedNode.set({
							node: this.currentTangentNode,
							match: undefined
						})
					}
				}
				
				this.mode.set('content')
				this.applySelection(false)
				const [start, end] = this.autocomplete.range.value
				let index = this.text.indexOf('#')
				
				this.editor.select([start + index + 1, end - 2])
				event.preventDefault()
				return
			}
			if (event.key === '|' && this.options.enableText) {
				if (!this.linkText.value) {
					this.linkText.value = '|'
				}
				
				this.mode.set('text')
				this.applySelection(false)
				const [start, end] = this.autocomplete.range.value
				let index = this.text.indexOf('|')
				
				this.editor.select([start + index + 1, end - 2])
				event.preventDefault()
				return
			}
			if (event.key === '!' && this.options.enableEmbedding) {
				const range = this.autocomplete.range.value
				const selection = this.editor.doc.selection
				if (this.isEmbed.value) {
					// Remove the embed flag
					this.autocomplete.setRangeForNextChange([range[0] - 1, range[1] - 1])
					this.editor.change
						.delete([range[0] - 1, range[0]])
						.select([selection[0] - 1, selection[1] - 1])
						.apply()
				}
				else {
					this.autocomplete.setRangeForNextChange([range[0] + 1, range[1] + 1])
					this.editor.change
						.insert(range[0], '!')
						.select([selection[0] + 1, selection[1] + 1])
						.apply()
				}
				event.preventDefault()
			}
		}
	}
}