import { AttributeMap } from '@typewriter/document'
import NoteParser from './NoteParser'
import { isWhitespace } from './matches'

const italic_formatting = { italic: true, hiddenGroup: true }
const bold_formatting = { bold: true, hiddenGroup: true }
const italic_and_bold_formatting = { italic: true, bold: true, hiddenGroup: true }

function boldAndInlineFormatting(length: number) {
	switch (length) {
		case 1:
			return italic_formatting
		case 2:
			return bold_formatting
		case 3:
			return italic_and_bold_formatting
	}
}

const startAttributes = { start: true, hidden: true } as const
const endAttributes = { end: true, hidden: true } as const

export function parseEmphasis(char: string, parser: NoteParser): boolean {
	if (char !== '_' && char !== '*') return false

	const { feed, builder } = parser

	const start = feed.index
	const last = feed.peek(-1)
	const leftTouchingText = !isWhitespace(last)
	const count = feed.consumeSequentialCharacters(char, 3)
	const next = feed.peek()
	const rightTouchingText = !isWhitespace(next)

	if (!leftTouchingText && !rightTouchingText) return false

	if (char === '_' && !parser.options?.allowInterTextUnderscoreFormatting && leftTouchingText && rightTouchingText) {
		// Block formatting for things like em_pha_sis (requiring em*pha*sis instead)
		// This should only be triggered by word & number characters
		if (last.match(/[\w\d]/) && next.match(/[\w\d]/)) {
			return false
		}
	}

	const formatString = feed.text.substring(start, feed.index + 1)
	const isOpen = builder.hasOpenFormat(formatString)

	if (isOpen && leftTouchingText) {
		parser.commitSpan(null, -count+1)
		parser.commitSpan(endAttributes)
		builder.dropOpenFormat(formatString)
	}
	else if (!isOpen && rightTouchingText) {
		parser.commitSpan(null, -count+1)

		builder.addOpenFormat(formatString, boldAndInlineFormatting(count))
		parser.commitSpan(startAttributes)
	}
	return true
}

function openOrCloseFormatting(formatting: string, attributes: AttributeMap, parser: NoteParser): boolean {
	const { feed, builder } = parser

	const leftTouchingText = !isWhitespace(feed.peek(-formatting.length))
	const rightChar = feed.peek()
	const rightTouchingText = !isWhitespace(rightChar) && !formatting.includes(rightChar)

	if (leftTouchingText || rightTouchingText) {
		if (!parser.isStartOfContent) parser.commitSpan(null, parser.feed.currentStepLength - formatting.length)
		
		if (leftTouchingText && builder.hasOpenFormat(formatting)) {
			parser.commitSpan(endAttributes)
			builder.dropOpenFormat(formatting)
			return true
		}
		else if (rightTouchingText && !builder.hasOpenFormat(formatting)) {
			builder.addOpenFormat(formatting, {
				hiddenGroup: true,
				...attributes
			})
			parser.commitSpan(startAttributes)
			return true
		}	
	}

	return false
}

const strikethroughAttributes = { strikethrough: true }
export function parseStrikethrough(char: string, parser: NoteParser): boolean {
	if (char === '~' && parser.feed.checkFor('~~')) {
		return openOrCloseFormatting('~~', strikethroughAttributes, parser)
	}
	return false
}

const highlightAttributes = { highlight: true }
export function parseHighlight(char: string, parser: NoteParser): boolean {
	if (char === '=' && parser.feed.checkFor('==')) {
		return openOrCloseFormatting('==', highlightAttributes, parser)
	}
	return false
}

const highlight = [
	'🔴', '🟥', '🟠', '🟧', '🟡', '🟨', '🟢', '🟩', '🔵', '🟦', '🟣', '🟪'
]

// See https://stackoverflow.com/questions/37089427/javascript-find-emoji-in-string-and-parse
export const highlightEmojiMatch = new RegExp(highlight.join('|'))

export function highlightEmojiToClassDescriptor(emoji: string) {
	switch (emoji) {
		case '🔴':
			return 'red circle'
		case '🟥':
			return 'red square'
		case '🟠':
			return 'orange circle'
		case '🟧':
			return 'orange square'
		case '🟡':
			return 'yellow circle'
		case '🟨':
			return 'yellow square'
		case '🟢':
			return 'green circle'
		case '🟩':
			return 'green square'
		case '🔵':
			return 'blue circle'
		case '🟦':
			return 'blue square'
		case '🟣':
			return 'purple circle'
		case '🟪':
			return 'purple square'
	}
}

const highlightFormatting: { [key: string]: AttributeMap } = {}

for (const h of highlight) {
	highlightFormatting[h] = {
		highlight: highlightEmojiToClassDescriptor(h)
	}
}

export function parseEmojiHighlight(char: string, parser: NoteParser): boolean {
	if (char.match(highlightEmojiMatch)) {
		return openOrCloseFormatting(char, highlightFormatting[char], parser)
	}
	return false
}

const backslashEscapes = [
	'_', '*', '-', '+', '$', '#', "~", '`', '[', ']', '(', ')', '<', '>'
]
export function parseBackslashEscape(char: string, parser: NoteParser): boolean {
	if (char === '\\' && backslashEscapes.includes(parser.feed.peek())) {
		// Close out previous content
		parser.commitSpan(null, 0)

		// Mark the backslash as hidden
		parser.commitSpan({ link_internal: true, hidden: true })

		// Consume the next character
		parser.moveNext()
	}
	return false
}

export function parseComment(char: string, parser: NoteParser): boolean {
	if (char === '/' && parser.feed.checkFor('//', false)) {
		const { feed, builder } = parser
		parser.commitSpan(null, 0)

		// Handle Comments
		// Clear all old open formats. Comments defeat everything
		builder.openLineScopedFormats = {}
		builder.addOpenFormat('comment', {
			line_comment: true
		})

		// Grab the next '/'
		feed.next()
		// Grab the trailing space
		if (feed.peek() === ' ') feed.next()
		parser.commitSpan({ line_comment: 'start', hidden: true })
		return true
	}
	return false
}
