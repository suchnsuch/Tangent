import type { IToken } from 'vscode-textmate'
import type { QueryParseResult } from './parser'

export function getTokenIndex(source: QueryParseResult | IToken[], textPosition: number) {
	const tokens = Array.isArray(source) ? source : source.tokens

	for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
		const token = tokens[tokenIndex]
		if (token.startIndex <= textPosition && token.endIndex > textPosition) {
			return tokenIndex
		}
	}
	return -1
}
