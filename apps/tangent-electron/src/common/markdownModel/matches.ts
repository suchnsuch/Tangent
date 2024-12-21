// TODO: Remove
export const horizontalRuleText = /^((- *){3,}|(\* *){3,}|(_ *){3,})$/

// TODO: provide a contextual wrapper of what this parses

export const indentMatcher = /^\s*/

export function isWhitespace(char: string) {
	switch(char) {
		case '':
			return true
		case '\n':
			return true
		case ' ':
			return true
		case '\t':
			return true
	}
}
