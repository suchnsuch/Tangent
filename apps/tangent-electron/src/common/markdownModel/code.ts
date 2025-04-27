import { getLanguage, parseTokens, tokenize, tokensToOps } from './codeSyntax'
import DocumentFeeder from './DocumentFeeder'
import NoteParser from './NoteParser'
import { AttributeMap } from 'typewriter-editor'
import { ParsingContext, ParsingContextType, ParsingProgram } from './parsingContext'
import LinesBuilder from './LinesBuilder'
import { lineToText } from 'common/typewriterUtils'
import { negativeInlineFormats } from './typewriterTypes'

export function parseInlineCode(char: string, parser: NoteParser): boolean {
	if (char !== '`') return false

	const { feed } = parser

	const start = feed.index
	const startCount = feed.consumeSequentialCharacters(char)
	const formatString = feed.substring(start, start + startCount)

	// Close previous spans
	parser.commitSpan(null, -startCount+1)

	// Mark the start
	parser.commitSpan({
		start: true,
		hidden: true,
		hiddenGroup: true,
		inline_code: true
	})

	const nextSpan: AttributeMap = {}

	if (feed.peekLastNonFormatCharacter(start) === ' ') {
		// lets styling provide better spacing
		nextSpan.afterSpace = true
	}

	// Start consuming content
	feed.next()
	nextSpan.inline_code = true
	nextSpan.hiddenGroup = true

	const { foundMatch } = feed.consumeUntil(formatString)

	if (foundMatch) {
		if (feed.peekNextNonFormatCharacter() === ' ') {
			// lets styling provide better spacing
			nextSpan.beforeSpace = true
		}
		parser.commitSpan(nextSpan, -startCount+1)

		parser.commitSpan({
			end: true,
			hidden: true,
			hiddenGroup: true,
			inline_code: true
		})
	}
	else {
		parser.commitSpan(nextSpan, 0)
	}
	return true
}

export type CodeParsingContext = ParsingContext & {
	/** The data for the code being parsed */
	data: CodeData
	/** The index of the first line */
	firstLine: number
	resolvedLanguage: string
	/** The code that has been discovered so far */
	code: string
	/** Determines whether or not the end has been reached */
	isAtEnd: ParsingProgram
	/** Whether the end has been reached or not */
	reachedEnd: boolean
}

export type CodeData = {
	language: string
	indent: number
}

export function parseCodeBlock(char: string, parser: NoteParser): boolean {
	if (char !== '`' || !parser.isStartOfContent) return false
	if (!parser.feed.checkFor('```')) return false

	const { feed, builder } = parser

	const indent = parser.getCurrentIndent()

	// Handle code blocks
	parser.commitSpan({
		line_format: 'code',
		hidden: true,
		start: true
	})

	let codeFormat = feed.getLineText(feed.index + 1, true).trim()
	parser.commitSpan({
		line_format: 'code',
		hiddenGroup: true,
		start: true
	}, 0)

	const codeData: CodeData = {
		language: codeFormat,
		indent: indent.indentSize
	}

	builder.addOpenLineFormat('code', {
		code: codeData
	})

	let resolvedLanguage = getLanguage(codeData.language)
	if (resolvedLanguage === 'Loading') {
		parser.flagAwaiting(codeData.language)
		resolvedLanguage = null
	}

	const context: CodeParsingContext = {
		type: ParsingContextType.Block,
		programs: [parseCodeLine],
		indent: indent.indent,
		indentBlock: true,
		extendContext: true,
		exit: finishCodeBlock,

		data: codeData,
		firstLine: builder.lines.length + 1,
		resolvedLanguage,
		code: '',
		isAtEnd: (char, parser, context) => {
			const line = parser.feed.getLineText()
			if (line.trimEnd() === '```') {
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

export function parseCodeLine(char: String, parser: NoteParser, ctxt: ParsingContext): boolean {
	const context = ctxt as CodeParsingContext
	const { feed } = parser

	if (context.isAtEnd(char, parser, ctxt)) {
		context.reachedEnd = true
		parser.popContext()
		return true
	}

	const line = feed.getLineText(feed.index, true)
	context.code += line

	let attributes: AttributeMap = null

	if (context.resolvedLanguage) {
		// Tokenization is applied later
		attributes = { codePlaceholder: true }
	}

	parser.commitSpan(attributes, 0)

	if (feed.hasMore(true)) {
		// We need to inject newlines ourselves
		context.code += '\n'
	}

	return true
}

export function applyCodeFormat(parser: NoteParser, context: CodeParsingContext) {
	if (context.resolvedLanguage) {
		const { builder } = parser

		const tokens = tokenize(context.code, context.resolvedLanguage)
		if (!tokens) {
			console.error('No tokens for', context.resolvedLanguage)
			return
		}

		const lines = parser.builder.lines
		const tokenOps = tokensToOps(tokens, null)

		let lineIndex = context.firstLine
		let opIndex = 0

		for (; lineIndex < lines.length; lineIndex++) {

			const line = lines[lineIndex]
			const ops = line.content.ops

			if (ops.length) {
				const last = ops.at(-1)
				if (last.attributes?.codePlaceholder) {
					// Pop the placeholder
					ops.pop()
				}
			}

			for (; opIndex < tokenOps.length; opIndex++) {
				const op = tokenOps[opIndex]
				if (op.insert === '\n') {
					opIndex++
					// jump to the next line
					break
				}

				if (builder.outputFormattingRetains) {
					// Swap insert for retain
					op.retain = op.insert.length
					delete op.insert
					// Need to clear out other inline attributes
					op.attributes = {
						...negativeInlineFormats,
						...(op.attributes ?? {})
					}
				}

				ops.push(op)
			}
		}

		// If code is the last line of a document, the last line hasn't been built
		if (opIndex < tokenOps.length) {
			if (builder.spans.at(-1)?.attributes?.codePlaceholder) {
				builder.spans.pop()
			}

			for (; opIndex < tokenOps.length; opIndex++) {
				const op = tokenOps[opIndex]
				if (op.insert === '\n') {
					// Exit
					break
				}

				builder.addSpan(op.insert as string, op.attributes)
			}
		}
	}
}

export function finishCodeBlock(lastIndex: number, ctxt: ParsingContext, parser: NoteParser) {
	const { feed, builder } = parser
	const context = ctxt as CodeParsingContext

	applyCodeFormat(parser, context)

	builder.dropOpenLineFormat('code')

	if (context.reachedEnd) {
		parser.commitSpan({
			line_format: 'code',
			hidden: true,
			end: true
		}, 0)

		parser.lineData.code = context.data
	}
	else if (lastIndex === feed.index) {
		parser.lineData.code = context.data
	}

	if (feed instanceof DocumentFeeder && !feed.hasMore()) {
		feed.injectAdjacentLinesWhile(line => 'code' in line.attributes)
	}
}

/**
 * @deprecated Replace with context & finish paradigm
 */
export function readCodeLines(parser: NoteParser, language: string, end: string) {
	let realLanguage = getLanguage(language)
	if (realLanguage === 'Loading') {
		parser.flagAwaiting(language)
		realLanguage = null
	}

	const { feed } = parser

	// The code sent to be parsed by the language parser
	let allCode: string = ''
	let line: string = null
	let hitEnd = false

	while (feed.hasMore(true)) {
		line = feed.getLineText(feed.index, true)
		// Allow ending line to include whitespace
		if (line.trimEnd() === end) {
			// Break out and handle below
			hitEnd = true
			break
		}

		allCode = allCode + line
		
		if (!realLanguage) {
			// We can commit this code immediately.
			// Real languages are tokenized below.
			parser.commitSpan(null, 0)
		}

		if (feed.hasMore(true)) {
			// Line breaks need to be inserted manually
			allCode += '\n'

			if (!realLanguage) {
				parser.commitLine()
			}
			
			parser.moveNext(false, true)
		}
	}

	// Close out the code
	if (realLanguage) {
		// The position of the parser, feed, and builder have diverged
		// We need to sync them back up
		// TODO: Make the divergence unecessary. Maybe by rewinding the feed & using commits?
		const tokens = tokenize(allCode, realLanguage)
		if (!tokens) {
			console.error('No tokens for', realLanguage)
		}
		parseTokens(tokens, parser.builder)

		// This code is touchy. Make sure you run tests to confirm
		if (hitEnd) {
			// Reset the span start to the _start_ of the `end` line
			// This lets the caller decide how to format it
			parser.setSpanStart(feed.index - line.length)
		}
		else {
			// The end of parsing will push the last line
			// but we don't want to duplicate the last line
			// TODO: Make this go away
			parser.setSpanStart(feed.index)
		}
	}

	return {
		allCode,
		hitEnd
	}
}
