import { firstOfType, includesAny, last } from '@such-n-such/core'
import { getTokenIndex, KEYWORD, VALUE_OPENERS, QueryParseResult } from '@such-n-such/tangent-query-parser'
import { CachingStore, WritableStore } from 'common/stores'
import { buildFuzzySegementMatcher, compareNodeSearch, SearchMatchResult } from 'common/search'
import { clamp } from 'common/utils'
import { derived, Readable } from 'svelte/store'
import { TextDocument, EditorRange, isEqual } from 'typewriter-editor'
import type { IToken } from 'vscode-textmate'
import type { AutocompleteHandler, AutocompleteModule } from '../autocomplete/autocompleteModule'
import WikiLinkAutocompleter from '../autocomplete/WikiLinkAutocompleter'
import TagAutocompleter from '../autocomplete/TagAutocompleter'
import { wrappedIndex } from 'common/collections'

const NON_ACTIVATE_VALUES = [
	KEYWORD.VALUE.STRING_DOUBLE,
	KEYWORD.VALUE.STRING_SINGLE,
	KEYWORD.VALUE.REGEX,
	KEYWORD.VALUE.REGEX_ARGS,
	KEYWORD.VALUE.WIKI,
	KEYWORD.VALUE.TAG,
	KEYWORD.VALUE.TODO.ANY,
	KEYWORD.VALUE.TODO.OPEN,
	KEYWORD.VALUE.TODO.CLOSED
]

const DELIM_STARTS = [
	KEYWORD.PUNCTUATION.GROUP_START,
	KEYWORD.PUNCTUATION.QUERY_START
]
const DELIM_ENDS = [
	KEYWORD.PUNCTUATION.GROUP_END,
	KEYWORD.PUNCTUATION.QUERY_END
]

const WEAK_SCOPES = [
	'source.tangentquery',
	'meta.subquery'
]

export interface QueryAutocompleteItem {
	key: string
	text: string
	label?: string
	tooltip?: string
	match?: SearchMatchResult
}

const COMPLETE_DATA: { [key: string]: {
	text?: string | string[],
	label?: string,
	tooltip?: string
}} = {
	[KEYWORD.FORM]: {
		text: [
			'Files', 'Notes', 'Images',
			'Sets', 'Folders', 'Queries'
		]
	},
	[KEYWORD.CLAUSE]: {
		text: [
			'in', 'with', 'named',
			//'linked from' // Not in yet
		]
	},
	[KEYWORD.NOT]: {
		text: 'not',
		tooltip: 'Inverts the next clause.'
	},
	[KEYWORD.JOIN.AND]: {
		text: 'and'
	},
	[KEYWORD.JOIN.OR]: {
		text: 'or'
	},
	[KEYWORD.VALUE.STRING_DOUBLE]: {
		label: '\"Exact Text\"',
		text: '',
		tooltip: 'Searches for an exact string of text, as written.'
	},
	[KEYWORD.VALUE.STRING_SINGLE]: {
		label: '\'Fuzzy Text\'',
		text: '',
		tooltip: 'Converts the search string into a case-insensitive fuzzy matcher that matches the text in order, but not necessarily sequentially.'
	},
	[KEYWORD.VALUE.REGEX]: {
		label: '/Regex/',
		text: '',
		tooltip: 'Searches with the provided regex statement.'
	},
	[KEYWORD.VALUE.WIKI]: {
		label: '[[Wiki Reference]]',
		text: '',
		tooltip: 'Selects items that contain a reference to the file behind the wiki reference.'
	},
	[KEYWORD.VALUE.TAG]: {
		label: '#tag',
		text: '',
		tooltip: 'Selects items that contain the defined tag.'
	},
	[KEYWORD.VALUE.SUBQUERY]: {
		label: '{Subquery}',
		text: '',
		tooltip: 'Selects items that match an additional subquery. e.g. `Notes in {Folders named "Foo"}`'
	},
	[KEYWORD.VALUE.TODO.ANY]: {
		text: 'Todos',
		tooltip: 'Matches all Todos, in any state.'
	},
	[KEYWORD.VALUE.TODO.OPEN]: {
		text: 'Open Todos',
		tooltip: 'Matches all incomplete Todos.'
	},
	[KEYWORD.VALUE.TODO.CANCELED]: {
		text: 'Canceled Todos',
		tooltip: 'Matches all canceled Todos.'
	},
	[KEYWORD.VALUE.TODO.COMPLETE]: {
		text: 'Complete Todos',
		tooltip: 'Matches all complete Todos.'
	},
	[KEYWORD.VALUE.TODO.CLOSED]: {
		text: 'Closed Todos',
		tooltip: 'Matches all canceled or complete Todos.'
	}
}

function appendKeyToItems(key: string, items: QueryAutocompleteItem[]) {
	const data = COMPLETE_DATA[key]
	if (!data) return

	let { text, tooltip, label } = data

	if (Array.isArray(text)) {
		for (const t of text) {
			items.push({
				key,
				text: t,
				label,
				tooltip
			})
		}
	}
	else {
		items.push({
			key, text, tooltip, label
		})
	}
}

export default class QueryAutocompleter implements AutocompleteHandler {

	autocomplete: AutocompleteModule

	queryResult = new WritableStore<QueryParseResult>(null)
	sourceText = new WritableStore<string>('')

	tokenIndex = new WritableStore<number>(-1)
	token: Readable<IToken>
	lastToken: Readable<IToken>

	expects: CachingStore<QueryAutocompleteItem[]>
	selectedItemIndex = new WritableStore<number>(0)

	constructor() {
		this.token = derived([this.queryResult, this.tokenIndex], ([query, index]) => {
			if (!query || index < 0) return null
			return query.tokens[index]
		})
		this.lastToken = derived([this.queryResult, this.tokenIndex], ([query, index]) => {
			if (!query || index < 0) return null
			return query.tokens[index - 1]
		})

		this.expects = new CachingStore(derived([this.queryResult, this.tokenIndex, this.sourceText], ([query, index, sourceText]) => {

			let result: QueryAutocompleteItem[] = []

			if (query) {
				for (let expectIndex = index - 1; expectIndex >= -1; expectIndex--) {
					if (expectIndex < 0) {
						// Default to form
						appendKeyToItems(KEYWORD.FORM, result)
					}
					else {
						const expects = query.annotations[expectIndex]?.expects
						if (expects && expects.length) {
							for (const item of expects) {
								appendKeyToItems(item, result)
							}
							break
						}
					}
				}
			}

			const matcher = buildFuzzySegementMatcher(sourceText)

			result.forEach(i => {
				i.match = i.text.match(matcher)
			})

			result.sort((a, b) => {
				return compareNodeSearch(a.match, b.match) 
			})

			return result
		}), (prev, next) => {
			if (!isEqual(prev, next)) {
				this.selectedItemIndex.set(0)
			}
		})
	}

	init(autocomplete: AutocompleteModule) {
		this.autocomplete = autocomplete
	}

	updateQueryResult(queryResult: QueryParseResult) {
		this.queryResult.set(queryResult)

		const doc = this.autocomplete.editor.doc

		if (!queryResult || !doc || !doc.selection) return

		// Probably need to do something with active ranges…
		const currentAutocomplete = this.autocomplete.activeHandler.value
		if (!currentAutocomplete || currentAutocomplete === this) {
			const range = this.canActivate(doc)
			if (range) {
				if (!currentAutocomplete) {
					this.autocomplete.activateHandler(this, range, doc)
				}
				else if (currentAutocomplete === this) {
					this.autocomplete.range.set(range)
				}
			}
			else if (currentAutocomplete === this) {
				this.autocomplete.endAutocomplete()
			}
		}
	}

	// If activatable, return the range the handler will control
	canActivateFromTyping(char: string, doc: TextDocument): EditorRange | false {
		return false// this.canActivate(doc, char.length)
	}

	// Called when the shortcut (e.g. ctrl+Space) is pressed
	canActivateByRequest(doc: TextDocument): EditorRange | false {
		return this.canActivate(doc)
	}

	canActivate(doc: TextDocument, offset = 0): EditorRange | false {
		const effectiveSelection = doc.selection[0] - offset
		// Guard against stomping wiki link autocomplete
		const offsetText = doc.getText([effectiveSelection, doc.selection[1]])
		if (offsetText === '[') return false

		const query = this.queryResult.value
		
		let tokenIndex = getTokenIndex(query, effectiveSelection)
		if (tokenIndex < 0) {
			return false
		}
		// We want a cursor like {foo|} to use "foo" but like {|} to use the last bracket
		else if (DELIM_ENDS.includes(last(query.tokens[tokenIndex].scopes))) {
			if (!DELIM_STARTS.includes(last(query.tokens[tokenIndex - 1].scopes))) {
				tokenIndex--
			}
		}

		const token = query.tokens[tokenIndex]
		const tokenStart = token.startIndex
		const tokenEnd = token.endIndex + offset
		const scopes = token.scopes

		if (includesAny(scopes, NON_ACTIVATE_VALUES)) {
			return false
		}

		const text = doc.getText()

		let range: EditorRange = [tokenStart, tokenEnd]
		if (WEAK_SCOPES.includes(last(scopes))) {
			const tokenText = text.substring(tokenStart, tokenEnd)
			const match = tokenText.match(/\s?(.*)(\s|$)/d)
			if (match) {
				// Need to only select the "middle" whitespace, with buffer on either side
				const matchRange = (match as any).indices[1] as number[]
				range = [tokenStart + matchRange[0], tokenStart + matchRange[1]]
			}
		}
		else if (DELIM_ENDS.includes(last(scopes))) {
			range = [effectiveSelection, effectiveSelection]
		}

		this.tokenIndex.set(tokenIndex)
		return range
	}

	// Return true if the source text is still valid, false exits autocomplete
	updateSourceText(text: string, doc: TextDocument): boolean {
		if (text.startsWith('[[') || text.startsWith('/')) {
			requestAnimationFrame(() => {
				const wikilinks = firstOfType(this.autocomplete.handlers, WikiLinkAutocompleter)
				this.autocomplete.tryActivatingHandler(wikilinks)
			})
			return false
		}
		else if (text.startsWith('#')) {
			requestAnimationFrame(() => {
				const tags = firstOfType(this.autocomplete.handlers, TagAutocompleter)
				this.autocomplete.tryActivatingHandler(tags)
			})
			return false
		}

		this.sourceText.set(text)
		return true
	}

	getCurrentOptionText() {
		const items = this.expects.value
		const index = this.selectedItemIndex.value

		const item = items[index]

		requestAnimationFrame(() => {
			if (item.text === '') {
				const opener = VALUE_OPENERS[item.key]
				if (opener) {
					this.autocomplete.editor.insert(opener)
					if (opener === '[[') {
						const wikilinks = firstOfType(this.autocomplete.handlers, WikiLinkAutocompleter)
						this.autocomplete.tryActivatingHandler(wikilinks)
					}
					else if (opener === '#') {
						const tags = firstOfType(this.autocomplete.handlers, TagAutocompleter)
						this.autocomplete.tryActivatingHandler(tags)
					}
				}
			}
			else {
				this.autocomplete.editor.insert(' ')
			}
		})

		return items[index]?.text
	}

	// Invoked by arrow key presses
	shiftSelection(shift: number) {
		const items = this.expects.value
		this.selectedItemIndex.update(i => wrappedIndex(items, i + shift))
	}

	get isActive() { return this.autocomplete.activeHandler.value === this }
}
