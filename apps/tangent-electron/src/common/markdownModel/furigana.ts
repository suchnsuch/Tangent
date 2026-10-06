import NoteParser from './NoteParser'
import { getInlineId } from './inline'

export type FuriganaData = {
	base: string
	reading: string
}

export type FuriganaScanResult =
	| { type: 'valid', end: number, furigana: FuriganaData }
	| { type: 'interrupted', end: number } // `end` is the index of the interrupting `{`
	| false

/**
 * An unescaped `{` before the closing `}` interrupts the span rather than
 * being balanced against it.
 */
export function scanFuriganaSpan(text: string, start = 0): FuriganaScanResult {
	if (text[start] !== '{' || isEscaped(text, start)) return false

	let separatorIndex = -1

	for (let index = start + 1; index < text.length; index++) {
		const char = text[index]

		if (char === '\n' || char === '\r') return false

		const next = text[index + 1]
		if (char === '\\' && next !== '\\' && next !== '\n' && next !== '\r') {
			index++ // skip the escaped character
			continue
		}

		if (char === '{') return { type: 'interrupted', end: index }

		if (char === '}') {
			if (separatorIndex < 0) return false

			const base = unescapeFuriganaText(trimUnescapedWhitespace(text.slice(start + 1, separatorIndex)))
			const reading = unescapeFuriganaText(trimUnescapedWhitespace(text.slice(separatorIndex + 1, index)))
			if (!base || !reading) return false

			return { type: 'valid', end: index, furigana: { base, reading } }
		}

		if (separatorIndex < 0 && char === '|') {
			separatorIndex = index
		}
	}

	return false
}

export function parseInlineFurigana(char: string, parser: NoteParser): boolean {
	if (char !== '{') return false

	const { feed } = parser
	const result = scanFuriganaSpan(feed.text, feed.index)
	if (!result) return false

	if (result.type === 'interrupted') {
		// Preserve both openers as literal source; skipping the interrupting
		// opener keeps it from starting a span of its own.
		feed.nextByLength(result.end - feed.index)
		parser.commitSpan(null)
		return true
	}

	if (result.type !== 'valid') return false

	parser.commitSpan(null, 0)
	const start = feed.index
	feed.nextByLength(result.end - feed.index)
	parser.commitSpan({
		furigana: result.furigana,
		hiddenGroup: getInlineId(parser, start, result.end + 1)
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
