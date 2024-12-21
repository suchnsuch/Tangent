import { readCodeLines } from './code'
import DocumentFeeder from './DocumentFeeder'
import { isWhitespace } from './matches'
import NoteParser from './NoteParser'

export function parseInlineMath(char: string, parser: NoteParser): boolean {
	if (char !== '$') return false

	const { feed } = parser

	const isBlock = feed.checkFor('$$')
	const token = isBlock ? '$$' : char
	let leftTouchingText = !isWhitespace(feed.peek(-token.length))
	let rightTouchingText = !isWhitespace(feed.peek())

	if (!leftTouchingText && rightTouchingText) {
		feed.next()
		const findResult = feed.findNext(token)
		if (findResult.foundMatch) {
			if (!isWhitespace(feed.peek(findResult.contentCount - 1))) {
				// We've got it!
				parser.commitSpan(null, -token.length)
				const index = feed.index
				feed.next(findResult.contentCount + token.length - 1)
				parser.commitSpan({
					math: {
						source: feed.substring(index, index + findResult.contentCount),
						isBlock
					},
					hidden: true
				})
				return true
			}
		}
	}
	return false
}

export function parseMathBlock(char: string, parser: NoteParser): boolean {
	if (char !== '$' || !parser.isStartOfContent) return false
	if (!parser.feed.checkFor('$$', false)) return false

	const { feed, builder } = parser

	const remainingContent = feed.getLineText(feed.index + 2)
	if (remainingContent) {
		// This will be read as an inline math expression that starts with `$$`, supported for legacy reasons
		return false
	}
	
	// Interpret as math block
	feed.getLineText(feed.index + 1, true)
	parser.commitSpan({
		line_format: 'math',
		hidden: true,
		start: true
	}, 0)
	
	// Declare here so it can be updated after the fact
	const mathContent = {} as any

	builder.addOpenLineFormat('math-block', {
		math: mathContent,
		hidden: true
	})

	parser.moveNext() // Jump the new line

	const { hitEnd, allCode } = readCodeLines(parser, 'latex', '$$')

	if (hitEnd) {
		parser.commitSpan({
			line_format: 'math',
			hidden: true,
			end: true
		}, 0)

		builder.dropOpenLineFormat('math-block')
		parser.lineData.math = mathContent
		parser.lineData.hidden = true
	}

	mathContent.source = allCode

	if (feed instanceof DocumentFeeder && !feed.hasMore()) {
		feed.injectAdjacentLinesWhile(line => 'math' in line)
	}

	return true
}
