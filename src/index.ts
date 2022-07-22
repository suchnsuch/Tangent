import { IGrammar, INITIAL, IToken, Registry } from 'vscode-textmate'
import { Query, ClauseType, isClause, ClauseGroup } from './types'
import { last } from '@such-n-such/core'

type TextRange = [number, number]

interface QueryError {
	position: TextRange
	message: string
}

interface QueryParseResult {
	query?: Query
	errors?: QueryError[]
	tokens: IToken[]
}

export function parseQueryText(queryText: string, grammar: IGrammar): QueryParseResult {

	const tokens = []
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

	const lines = queryText.split('\n')
	let lineStartIndex = 0

	function tokenError(token: IToken, message: string) {
		errors.push({
			position: [lineStartIndex + token.startIndex, lineStartIndex + token.endIndex],
			message
		})
	}

	let ruleStack = INITIAL
	const groupStack: ClauseGroup[] = [query]
	for (const line of lines) {
		const result = grammar.tokenizeLine(line, ruleStack)
		ruleStack = result.ruleStack

		for (const token of result.tokens) {
			const tokenText = line.substring(token.startIndex, token.endIndex)
			
			console.log(tokenText, last(token.scopes))
			
			if (token.scopes.length === 1) {
				if (tokenText.trim()) {
					// If not whitespace, this is a bad token
					tokenError(token, `Unexpected token "${tokenText}"`)
					continue
				}
			}

			
		}

		lineStartIndex += line.length + 1
	}

	return buildResult()
}
