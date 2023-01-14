import type { IGrammar, INITIAL, IToken, Registry, StackElement } from 'vscode-textmate'
import { Query, ClauseType, ClauseGroup, isQuery, PartialClauseType, ClauseMod, TodoState } from './types'
import { last, escapeRegExp } from '@such-n-such/core'
import { tokenizeTagName } from './tags'

export interface QueryError {
	start: number
	end: number
	message: string
}

export interface QueryTokenAnnotation {
	expects?: string[]
}

export interface QueryParseResult {
	query?: Query
	errors?: QueryError[]
	tokens: IToken[]
	annotations?: QueryTokenAnnotation[]
}

export const KEYWORD = {
	FORM: 'keyword.other.form',
	CLAUSE: 'keyword.other.clause',
	MOD: 'keyword.other.mod',
	NOT: 'keyword.other.negate',
	JOIN: {
		ANY: 'keyword.operator.join',
		AND: 'keyword.operator.join.and',
		OR: 'keyword.operator.join.or',
		COMMA: 'keyword.operator.join.comma'
	},
	VALUE: {
		STRING_SINGLE: 'string.quoted.single.tangentquery',
		STRING_DOUBLE: 'string.quoted.double.tangentquery',
		REGEX: 'string.regexp.tangentquery',
		REGEX_ARGS: 'string.regexp.args.tangentquery',
		WIKI: 'string.other.wikilink.tangentquery',
		TAG: 'string.tag',
		TODO: {
			ANY: 'keyword.other.todo.any',
			OPEN: 'keyword.other.todo.open',
			CLOSED: 'keyword.other.todo.closed'
		},
		SUBQUERY: 'meta.subquery',
	},
	PUNCTUATION: {
		STRING_START: 'punctuation.definition.string.begin.tangentquery',
		STRING_END: 'punctuation.definition.string.end.tangentquery',
		GROUP_START: 'punctuation.definition.group.begin',
		GROUP_END: 'punctuation.definition.group.end',
		QUERY_START: 'punctuation.definition.subquery.begin',
		QUERY_END: 'punctuation.definition.subquery.end',
		TAG: 'punctuation.definition.tag'
	}
}

export const KEYWORDS = {
	JOINS: [KEYWORD.JOIN.AND, KEYWORD.JOIN.OR, KEYWORD.JOIN.COMMA],
	CLAUSE_STARTS: [KEYWORD.CLAUSE, KEYWORD.NOT],
	VALUES: [
		KEYWORD.VALUE.STRING_SINGLE,
		KEYWORD.VALUE.STRING_DOUBLE,
		KEYWORD.VALUE.REGEX,
		KEYWORD.VALUE.WIKI,
		KEYWORD.VALUE.SUBQUERY,
		KEYWORD.VALUE.TAG,
		KEYWORD.VALUE.TODO.ANY,
		KEYWORD.VALUE.TODO.OPEN,
		KEYWORD.VALUE.TODO.CLOSED
	],
	REFERENCE_VALUES: [
		KEYWORD.VALUE.WIKI,
		KEYWORD.VALUE.SUBQUERY
	],
	GROUPS: [
		KEYWORD.PUNCTUATION.GROUP_START,
		KEYWORD.PUNCTUATION.GROUP_END
	]
}

export const VALUE_OPENERS = {
	[KEYWORD.VALUE.STRING_DOUBLE]: '"',
	[KEYWORD.VALUE.STRING_SINGLE]: "'",
	[KEYWORD.VALUE.REGEX]: '/',
	[KEYWORD.VALUE.WIKI]: '[[',
	[KEYWORD.VALUE.SUBQUERY]: '{'
}

const EXPECTED_AFTER_VALUE = [
	...KEYWORDS.JOINS, ...KEYWORDS.CLAUSE_STARTS, KEYWORD.PUNCTUATION.GROUP_END, KEYWORD.PUNCTUATION.QUERY_END
]

export const MATCHING_BRACES = {
	"'": "'",
	'"': '"',
	'/': '/',
	'(': ')',
	'{': '}',
	'[': ']',
	'[[': ']]'
}

// An object of expected values for types and mods
export const CLAUSE_VALUES = {
	[ClauseType.Named]: {
		'': [KEYWORD.VALUE.STRING_DOUBLE, KEYWORD.VALUE.STRING_SINGLE, KEYWORD.VALUE.REGEX]
	}, 
	[ClauseType.With]: {
		'': KEYWORDS.VALUES,
		[ClauseMod.All]: KEYWORDS.REFERENCE_VALUES,
		[ClauseMod.Any]: KEYWORDS.REFERENCE_VALUES
	},
	[ClauseType.In]: {
		'': KEYWORDS.REFERENCE_VALUES,
		[ClauseMod.All]: KEYWORDS.REFERENCE_VALUES,
		[ClauseMod.Any]: KEYWORDS.REFERENCE_VALUES,
	},
	[ClauseType.LinkedFrom]: {
		'': [KEYWORD.VALUE.WIKI],
		[ClauseMod.All]: [KEYWORD.VALUE.WIKI],
		[ClauseMod.Any]: [KEYWORD.VALUE.WIKI]
	} 
} as const

function expectedValuesForClause(clause: PartialClauseType) {
	const set = CLAUSE_VALUES[clause.type]
	if (!set) {
		console.warn('No values defined for ', clause.type)
		return []
	}
	const values = set[clause.mod ?? '']
	if (!values) {
		console.warn('No values defined for ', clause)
	}
	return values ?? []
}

let queryGrammar: IGrammar
let initialStack: StackElement

interface TextmateLib {
	registry: Registry
	initialStack: StackElement
}
export async function installTextmate(textmate: TextmateLib) {
	queryGrammar = await textmate.registry.loadGrammar('source.tangentquery')
	initialStack = textmate.initialStack
}

function normalizeForm(formText: string) {
	return formText[0].toUpperCase() + formText.substring(1).toLowerCase()
}

function matchScopes(scopes: string[], target: string) {
	for (let i = scopes.length - 1; i >= 0; i--) {
		if (scopes[i].startsWith(target)) {
			return i
		}
	}
	return false
}

function matchAnyScope(scopes: string[], targets: string[]) {
	for (let i = scopes.length - 1; i >= 0; i--) {
		for (const target of targets) {
			if (scopes[i].startsWith(target)) {
				return [i, target]
			}
		}
	}
	return false
}

function buildFuzzySegementMatcher(segment: string) {
	const tokens = segment.split(/\s+/)
	let matchString = ''

	for (let index = 0; index < tokens.length; index++) {
		// Escape all regex characters for now
		matchString += '(' + escapeRegExp(tokens[index]) + ')'

		if (index < tokens.length - 1) {
			// Allow mid token to select everything
			matchString += '.*'
		}
		else {
			// Last tokens may only additionally match non-whitespace
			matchString += '[\\w\\d]*'
		}
	}

	// d is included so that indices of groups are returned
	return new RegExp(matchString, 'imgd')
}

function tokenizeQueryText(queryText: string): IToken[] {

	if (!queryGrammar || !initialStack) {
		throw "Call & await `installTextmate()` before using the parser."
	}

	const allTokens: IToken[] = []

	let ruleStack = initialStack
	let lineStartOffset = 0

	const lines = queryText.split('\n')
	for (const line of lines) {
		const result = queryGrammar.tokenizeLine(line, ruleStack)
		ruleStack = result.ruleStack

		for (const token of result.tokens) {
			allTokens.push({
				startIndex: token.startIndex + lineStartOffset,
				endIndex: token.endIndex + lineStartOffset,
				scopes: token.scopes
			})
		}

		lineStartOffset += line.length + 1
	}

	return allTokens
}

export function parseQueryText(queryText: string): QueryParseResult {

	const tokens: IToken[] = tokenizeQueryText(queryText)
	const query: Query = { forms: [], join: undefined, clauses: [] }
	const errors: QueryError[] = []
	const annotations: QueryTokenAnnotation[] = []

	function buildResult(): QueryParseResult {
		if (errors.length > 0) {
			return { errors, tokens, annotations }
		}
		return { query, tokens, annotations }
	}

	if (!queryText) {
		errors.push({
			start: 0,
			end: 0,
			message: 'Empty Query'
		})
		return buildResult()
	}

	function tokenError(token: IToken, message: string) {
		errors.push({
			start: token.startIndex,
			end: token.endIndex,
			message
		})
	}

	const groupStack: ClauseGroup[] = [query]

	// Each query needs its own "current clause" context
	// Allows for things like `Notes in { Folders named "Test" } or { Folders named "Foo" }`
	const currentClauseStack: PartialClauseType[] = [null]
	let currentClause: PartialClauseType = null
	function setCurrentClause(clauseType: ClauseType) {

		currentClause = {
			type: clauseType
		}

		currentClauseStack[currentClauseStack.length - 1] = currentClause
	}
	function setCurrentClauseMod(clauseMod: ClauseMod) {
		currentClause = {
			type: currentClause.type,
			mod: clauseMod
		}

		currentClauseStack[currentClauseStack.length - 1] = currentClause
	}

	let tokenIndex = -1
	let token: IToken = null
	let annotation: QueryTokenAnnotation = null
	let expectedNextToken = [KEYWORD.FORM]
	function next() {
		tokenIndex++
		token = tokens[tokenIndex]
		if (annotation && !annotation.expects) {
			//annotation.expects = expectedNextToken
		}
		if (token) {
			annotation = {}
			annotations.push(annotation)
		}
		return token
	}
	function peak(offset = 1) {
		return tokens[tokenIndex + offset]
	}
	function expect(...keys: string[]) {
		expectList(keys)
	}
	function expectList(keys: string[]) {
		expectedNextToken = keys
		annotation.expects = keys
	}
	
	function getTokenText(t: IToken = token) {
		return queryText.substring(t.startIndex, t.endIndex)
	}
	
	while (next()) {
		const tokenText = getTokenText()

		if (!matchAnyScope(token.scopes, expectedNextToken)) {
			if (tokenText.trim()) {
				// This wasn't supposed to happen
				tokenError(
					token,
					`Unexpected token "${tokenText}". Expected a: \"${expectedNextToken.join(', ')}\"`)
			}
			// Otherwise, this is whitespace
			continue
		}

		const currentGroup = last(groupStack)
		const lastScope = last(token.scopes)

		// The the token is good, just need to determine the context
		if (lastScope === KEYWORD.FORM) {
			if (isQuery(currentGroup)) {
				if (currentGroup.clauses.length === 0) {
					// Can still add forms
					currentGroup.forms.push(normalizeForm(tokenText))
				}
				else {
					tokenError(token, 'Implicit subquery not yet supported')
				}
			}
			else {
				tokenError(token, 'Implicit subquery not yet supported')
			}
			expect(KEYWORD.FORM, ...KEYWORDS.JOINS, ...KEYWORDS.CLAUSE_STARTS, ...KEYWORDS.GROUPS)
		}
		else if (lastScope === KEYWORD.CLAUSE) {
			setCurrentClause(tokenText.toLowerCase() as ClauseType)
			expect(KEYWORD.MOD, ...expectedValuesForClause(currentClause), KEYWORD.PUNCTUATION.GROUP_START)
		}
		else if (lastScope === KEYWORD.MOD) {
			setCurrentClauseMod(tokenText.toLowerCase() as ClauseMod)
			expect(...expectedValuesForClause(currentClause), KEYWORD.PUNCTUATION.GROUP_START)
		}
		else if (lastScope === KEYWORD.PUNCTUATION.STRING_START) {
			const startToken = token
			const startTokenText = tokenText
			const stringType = token.scopes.at(-2)

			let fullString = ''
			let closed = false

			do {
				next()

				if (!token) {
					// Parser has run out of tokens without closing the value
					let message = 'Value'
					if (fullString) {
						message += ' "' + fullString + '"'
					}
					message += ` was not closed. Expected a \`${MATCHING_BRACES[startTokenText]}\` to end the value.`
					errors.push({
						start: startToken.startIndex,
						end: queryText.length,
						message
					})
					return buildResult()
				}

				if (last(token.scopes) === KEYWORD.PUNCTUATION.STRING_END) {
					closed = true

					if (fullString.trim() === '') {
						errors.push({
							start: startToken.startIndex,
							end: token.endIndex,
							message: 'An empy value matches everything and is invalid.'
						})
					}

					switch (stringType) {
						case KEYWORD.VALUE.STRING_DOUBLE:
							currentGroup.clauses.push({
								...currentClause,
								text: fullString
							})
							break
						case KEYWORD.VALUE.STRING_SINGLE:
							currentGroup.clauses.push({
								...currentClause,
								regex: buildFuzzySegementMatcher(fullString)
							})
							break
						case KEYWORD.VALUE.WIKI:
							currentGroup.clauses.push({
								...currentClause,
								reference: fullString
							})
							break
						case KEYWORD.VALUE.REGEX:
							let regexArgs = ''
							const nextToken = peak()
							if (nextToken && last(nextToken.scopes) === KEYWORD.VALUE.REGEX_ARGS) {
								next()
								regexArgs = getTokenText()
							}
							// Inject 'd' so that indices of groups are returned
							if (!regexArgs.includes('d')) regexArgs += 'd'
							currentGroup.clauses.push({
								...currentClause,
								regex: new RegExp(fullString, regexArgs)
							})
							break
					}

					break
				}
				else {
					fullString += getTokenText()
				}
				
			} while (token && token.scopes.includes(stringType))

			if (!closed) {
				tokenError(
					startToken,
					`Expected ${MATCHING_BRACES[startTokenText]} to close the ${startTokenText} value.`)
			}
			
			expectList(EXPECTED_AFTER_VALUE)
		}
		else if (lastScope === KEYWORD.PUNCTUATION.TAG) {
			next()

			currentGroup.clauses.push({
				...currentClause,
				tag: {
					names: tokenizeTagName(getTokenText())
				}
			})

			expectList(EXPECTED_AFTER_VALUE)
		}
		else if (lastScope === KEYWORD.VALUE.TODO.ANY) {
			currentGroup.clauses.push({
				...currentClause,
				todo: TodoState.Any
			})

			expectList(EXPECTED_AFTER_VALUE)
		}
		else if (lastScope === KEYWORD.VALUE.TODO.OPEN) {
			currentGroup.clauses.push({
				...currentClause,
				todo: TodoState.Open
			})

			expectList(EXPECTED_AFTER_VALUE)
		}
		else if (lastScope === KEYWORD.VALUE.TODO.CLOSED) {
			currentGroup.clauses.push({
				...currentClause,
				todo: TodoState.Closed
			})

			expectList(EXPECTED_AFTER_VALUE)
		}
		else if (lastScope === KEYWORD.JOIN.AND || lastScope === KEYWORD.JOIN.OR) {
			
			const joinText = tokenText.toLowerCase() as ('and' | 'or')
			if (currentGroup.join === undefined) {
				currentGroup.join = joinText
			}
			else if (currentGroup.join !== joinText) {
				tokenError(token, 'Implicit group separationg not yet supported')
			}

			if (currentClause) {
				expect(/*KEYWORD.FORM,*/KEYWORD.MOD, ...KEYWORDS.CLAUSE_STARTS, ...expectedValuesForClause(currentClause), ...KEYWORDS.GROUPS, KEYWORD.PUNCTUATION.QUERY_START)
			}
			else {
				expect(/*KEYWORD.FORM,*/ ...KEYWORDS.CLAUSE_STARTS, ...KEYWORDS.GROUPS)
			}
		}
		else if (lastScope === KEYWORD.PUNCTUATION.GROUP_START) {
			const newGroup: ClauseGroup = {
				join: undefined,
				clauses: []
			}
			currentGroup.clauses.push(newGroup)
			groupStack.push(newGroup)

			if (currentClause) {
				expect(/*KEYWORD.FORM,*/ ...KEYWORDS.CLAUSE_STARTS, KEYWORD.MOD, ...expectedValuesForClause(currentClause), ...KEYWORDS.GROUPS, KEYWORD.PUNCTUATION.QUERY_START)
			}
			else {
				expect(/*KEYWORD.FORM,*/ ...KEYWORDS.CLAUSE_STARTS, ...KEYWORDS.GROUPS)
			}
		}
		else if (lastScope === KEYWORD.PUNCTUATION.GROUP_END || lastScope === KEYWORD.PUNCTUATION.QUERY_END) {
			if (groupStack.length === 1) {
				tokenError(token, 'Attempted to close a group without opening one.')
			}
			else {
				const group = groupStack.pop()
				if (group.join === undefined) {
					group.join = 'and'
				}

				if (lastScope === KEYWORD.PUNCTUATION.QUERY_END) {
					currentClauseStack.pop()
					currentClause = last(currentClauseStack)
				}
			}
		}
		else if (lastScope === KEYWORD.PUNCTUATION.QUERY_START) {
			const newQuery: Query = {
				forms: [],
				join: undefined,
				clauses: []
			}
			currentGroup.clauses.push({
				...currentClause,
				query: newQuery
			})
			groupStack.push(newQuery)
			// The new query needs its own clause context
			currentClauseStack.push(null)
			currentClause = null

			expect(KEYWORD.FORM)
		}
	}

	while (groupStack.length) {
		const group = groupStack.pop()
		if (group.join === undefined) {
			group.join = 'and'
		}
	}
	
	return buildResult()
}
