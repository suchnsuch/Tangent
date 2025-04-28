import { applyCodeFormat, CodeParsingContext, parseCodeLine, readCodeLines } from './code'
import DocumentFeeder from './DocumentFeeder'
import { isWhitespace } from './matches'
import NoteParser from './NoteParser'
import { ParsingContext, ParsingContextType } from './parsingContext'

export type MathData = {
	source?: string
}

type MathBlockContext = CodeParsingContext & {
	mathData: MathData
}

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

	const indent = parser.getCurrentIndent()
	
	// Declare here so its source can be updated after the fact
	const mathData: MathData = {}

	builder.addOpenLineFormat('math-block', {
		math: mathData,
		hidden: true
	})

	const context: MathBlockContext = {
		type: ParsingContextType.Block,
		programs: [parseCodeLine],
		indent: indent.indent,
		indentBlock: true,
		extendContext: true,
		exit: finishMathBlock,

		data: {
			language: 'latex'
		},
		mathData,
		firstLine: builder.lines.length + 1,
		resolvedLanguage: 'latex',
		code: '',
		isAtEnd: (char, parser, context) => {
			const line = parser.feed.getLineText()
			if (line.trimEnd() === '$$') {
				console.log('  exiting')
				parser.feed.nextByLength(line.length)
				
				return true
			}
			return false
		},
		reachedEnd: false
	}

	parser.pushContext(context)

	return true
}

function finishMathBlock(lastIndex: number, ctxt: ParsingContext, parser: NoteParser) {
	const { feed, builder } = parser
	const context = ctxt as MathBlockContext

	applyCodeFormat(parser, context)
	builder.dropOpenLineFormat('math-block')

	context.mathData.source = context.code

	if (context.reachedEnd) {
		parser.commitSpan({
			line_format: 'math',
			hidden: true,
			end: true
		}, 0)

		parser.lineData.math = context.mathData
		parser.lineData.hidden = true
	}
	else if (lastIndex === feed.index) {
		parser.lineData.math = context.mathData
		parser.lineData.hidden = true
	}

	if (feed instanceof DocumentFeeder && !feed.hasMore()) {
		feed.injectAdjacentLinesWhile(line => 'math' in line)
	}
}
