import { IGrammar, INITIAL, IToken, Registry, StackElement } from 'vscode-textmate'
import { Query, ClauseType, isClause, ClauseGroup, isQuery, PartialClauseValue } from './types'
import { last } from '@such-n-such/core'

type TextRange = [number, number]

interface QueryError {
	position: TextRange
	message: string
}

export interface QueryParseResult {
	query?: Query
	errors?: QueryError[]
	tokens: IToken[]
}

const KEYWORD = {
	FORM: 'keyword.other.form',
	CLAUSE: 'keyword.other.clause',
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
		SUBQUERY: 'meta.subquery'
	},
	PUNCTUATION: {
		STRING_START: 'punctuation.definition.string.begin.tangentquery',
		STRING_END: 'punctuation.definition.string.end.tangentquery',
	}
}

const KEYWORDS = {
	JOINS: [KEYWORD.JOIN.AND, KEYWORD.JOIN.OR, KEYWORD.JOIN.COMMA],
	CLAUSE_STARTS: [KEYWORD.CLAUSE, KEYWORD.NOT],
	VALUES: [
		KEYWORD.VALUE.STRING_SINGLE,
		KEYWORD.VALUE.STRING_DOUBLE,
		KEYWORD.VALUE.REGEX,
		KEYWORD.VALUE.WIKI,
		KEYWORD.VALUE.SUBQUERY
	]
}

const VALUE_DELIMS = {
	"'": "'",
	'"': '"',
	'[[': ']]',
	'/': '/'
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

function tokenizeQueryText(queryText: string, grammar: IGrammar): IToken[] {
	const allTokens: IToken[] = []

	let ruleStack = INITIAL
	let lineStartOffset = 0

	const lines = queryText.split('\n')
	for (const line of lines) {
		const result = grammar.tokenizeLine(line, ruleStack)
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

export function parseQueryText(queryText: string, grammar: IGrammar): QueryParseResult {

	const tokens: IToken[] = tokenizeQueryText(queryText, grammar)
	const query: Query = { forms: [], join: undefined, clauses: [] }
	const errors: QueryError[] = []

	function buildResult(): QueryParseResult {
		if (errors.length > 0) {
			console.log(errors)
			return { errors, tokens }
		}
		console.log(query)
		return { query, tokens }
	}

	if (!queryText) {
		errors.push({
			position: [0, 0],
			message: 'Empty Query'
		})
		return buildResult()
	}

	function tokenError(token: IToken, message: string) {
		errors.push({
			position: [
				token.startIndex, 
				token.endIndex
			],
			message
		})
	}

	let ruleStack = INITIAL
	const groupStack: ClauseGroup[] = [query]

	let expect = [KEYWORD.FORM]
	let currentClause: ClauseType = null

	let tokenIndex = -1
	let token: IToken = null
	function next() {
		tokenIndex++
		token = tokens[tokenIndex]
		return token
	}
	function peak(offset = 1) {
		return tokens[tokenIndex + offset]
	}
	
	function getTokenText(t: IToken = token) {
		return queryText.substring(t.startIndex, t.endIndex)
	}
	
	while (next()) {
		const tokenText = getTokenText()
		
		console.log(tokenText, token.scopes)

		if (!matchAnyScope(token.scopes, expect)) {
			if (tokenText.trim()) {
				// This wasn't supposed to happen
				tokenError(token, `Unexpected token "${tokenText}". Expected a: \"${expect.join(', ')}\"`)
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
			expect = [KEYWORD.FORM, ...KEYWORDS.JOINS, ...KEYWORDS.CLAUSE_STARTS]
		}
		else if (lastScope === KEYWORD.CLAUSE) {
			currentClause = tokenText.toLowerCase() as ClauseType

			expect = [...KEYWORDS.VALUES]
		}
		else if (lastScope === KEYWORD.PUNCTUATION.STRING_START) {
			const startToken = token
			const startTokenText = tokenText
			const stringType = token.scopes.at(-2)

			let fullString = ''
			let closed = false

			do {
				next()

				if (last(token.scopes) === KEYWORD.PUNCTUATION.STRING_END) {
					closed = true

					switch (stringType) {
						case KEYWORD.VALUE.STRING_DOUBLE:
							currentGroup.clauses.push({
								type: currentClause,
								text: fullString
							})
							break
						case KEYWORD.VALUE.STRING_SINGLE:
							
							break
						case KEYWORD.VALUE.WIKI:
							currentGroup.clauses.push({
								type: currentClause,
								reference: fullString
							})
							break
						case KEYWORD.VALUE.REGEX:
							let regexArgs = ''
							const nextToken = peak()
							if (last(nextToken.scopes) === KEYWORD.VALUE.REGEX_ARGS) {
								next()
								regexArgs = getTokenText()
							}
							currentGroup.clauses.push({
								type: currentClause,
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
				tokenError(startToken, `Expected ${VALUE_DELIMS[startTokenText]} to close the ${startTokenText} value.`)
			}
			
			expect = [...KEYWORDS.JOINS, ...KEYWORDS.CLAUSE_STARTS]
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
				expect = [KEYWORD.FORM, ...KEYWORDS.CLAUSE_STARTS, ...KEYWORDS.VALUES]
			}
			else {
				expect = [KEYWORD.FORM, ...KEYWORDS.CLAUSE_STARTS]
			}
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
