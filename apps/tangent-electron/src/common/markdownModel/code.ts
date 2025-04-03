import { cp } from 'fs'
import { getLanguage, parseTokens, tokenize } from './codeSyntax'
import DocumentFeeder from './DocumentFeeder'
import NoteParser from './NoteParser'
import { AttributeMap } from 'typewriter-editor'

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

export function parseCodeBlock(char: string, parser: NoteParser): boolean {
	if (char !== '`' || !parser.isStartOfContent) return false
	if (!parser.feed.checkFor('```')) return false

	const { feed, builder } = parser

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

	const codeData = { language: codeFormat }

	builder.addOpenLineFormat('code', {
		code: codeData
	})

	parser.moveNext()

	const { hitEnd } = readCodeLines(parser, codeFormat, '```')
	
	if (hitEnd) {
		parser.commitSpan({
			line_format: 'code',
			hidden: true,
			end: true
		}, 0)
		builder.dropOpenLineFormat('code')
		
		parser.lineData.code = codeData

		if (feed instanceof DocumentFeeder && !feed.hasMore()) {
			feed.injectAdjacentLinesWhile(line => 'code' in line.attributes)
		}
	}
	
	return true
}


