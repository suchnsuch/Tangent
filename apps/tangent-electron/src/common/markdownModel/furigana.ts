import NoteParser from './NoteParser'

export type FuriganaData = {
	base: string
	reading: string
	/** Distinguishes adjacent furigana that share a base and reading. */
	instance?: string
}

export type FuriganaScanResult =
	| { type: 'valid', end: number, furigana: FuriganaData }
	| { type: 'nested', end: number } // `end` is the index of the invalidating inner `{`
	| { type: 'invalid' }

/**
 * Nested spans are intentionally inactive: the first unescaped `{` after
 * the opener invalidates the span rather than being balanced against it.
 */
export function scanFuriganaSpan(text: string, start = 0): FuriganaScanResult {
	if (text[start] !== '{' || isEscaped(text, start)) return { type: 'invalid' }

	let separatorIndex = -1

	for (let index = start + 1; index < text.length; index++) {
		const char = text[index]

		if (char === '\n' || char === '\r') return { type: 'invalid' }

		const next = text[index + 1]
		if (char === '\\' && next !== '\\' && next !== '\n' && next !== '\r') {
			index++ // skip the escaped character
			continue
		}

		if (char === '{') return { type: 'nested', end: index }

		if (char === '}') {
			if (separatorIndex < 0) return { type: 'invalid' }

			const base = unescapeFuriganaText(trimUnescapedWhitespace(text.slice(start + 1, separatorIndex)))
			const reading = unescapeFuriganaText(trimUnescapedWhitespace(text.slice(separatorIndex + 1, index)))
			if (!base || !reading) return { type: 'invalid' }

			return { type: 'valid', end: index, furigana: { base, reading } }
		}

		if (separatorIndex < 0 && char === '|') {
			separatorIndex = index
		}
	}

	return { type: 'invalid' }
}

export function parseInlineFurigana(char: string, parser: NoteParser): boolean {
	if (char !== '{') return false

	const { feed } = parser
	const result = scanFuriganaSpan(feed.text, feed.index)

	if (result.type === 'nested') {
		// Swallow through the invalidating brace as literal text so the
		// dispatch loop never retries there and rescues it as its own span.
		feed.nextByLength(result.end - feed.index)
		parser.commitSpan(null)
		return true
	}

	if (result.type !== 'valid') return false

	parser.commitSpan(null, 0)
	const start = feed.index
	feed.nextByLength(result.end - feed.index)
	parser.commitSpan({
		furigana: { ...result.furigana, instance: parser.getInstanceId(start, result.end + 1) },
		hiddenGroup: true
	})
	return true
}

// A backslash can escape any character except another backslash, so a run of
// backslashes never needs counting - escaping only ever depends on the
// single character immediately before `index`.
function isEscaped(text: string, index: number): boolean {
	return text[index - 1] === '\\' && text[index] !== '\\'
}

/**
 * Stops at an escaped whitespace character (e.g. the trailing `\ ` in
 * `reading\ `) so an escape pair is never split — that would strand its
 * backslash unmatched once unescapeFuriganaText runs.
 */
function trimUnescapedWhitespace(text: string): string {
	let start = 0
	while (start < text.length && isUnescapedWhitespace(text, start)) start++

	let end = text.length
	while (end > start && isUnescapedWhitespace(text, end - 1)) end--

	return text.slice(start, end)
}

// Furigana trims by Unicode whitespace, wider than matches.ts's isWhitespace
// (which treats only ASCII space/tab/newline/'' as whitespace).
const whitespaceRegex = /\s/

function isUnescapedWhitespace(text: string, index: number): boolean {
	return whitespaceRegex.test(text[index]) && !isEscaped(text, index)
}

const unescapeRegex = /\\([^\\])/g

function unescapeFuriganaText(text: string): string {
	return text.replace(unescapeRegex, '$1')
}
