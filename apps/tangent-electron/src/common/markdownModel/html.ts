import NoteParser from './NoteParser';
import { ParsingContext, ParsingContextType, ParsingProgram } from './parsingContext';

const WHITESPACE_MATCH = /\s/

const WHITESPACE_ATTRIBUTES = null
const PUNCTUATION_ATTRIBUTES = { code_syntax: 'punctuation' }
const LITERAL_ATTRIBUTES = { code_syntax: 'string' }
const CONTENT_ATTRIBUTES = { code_syntax: 'html-content' }

const ERROR_ATTRIBUTES = { code_syntax: 'invalid' }

type HtmlParsingContext = ParsingContext & {
	elementName: string
}

const tagParsingPrograms = [
	consumeWhitespace,
	parseTagInternals,
	badOpenBracket
]

const contentParsingPrograms = [
	parseHtml,
	parseCloseTag,
	badOpenBracket,
	badCloseBracket
]

const valueParsingPrograms = [
	consumeWhitespace,
	startValueParsing
]
const quoteValueParser = makeValueParser("'")
const doubleQuoteValueParser = makeValueParser('"')

const quoteValueParsingPrograms = [
	quoteValueParser,
	badCloseBracket,
	badOpenBracket
]

const doubleQuoteValueParsingPrograms = [
	doubleQuoteValueParser,
	badCloseBracket,
	badOpenBracket
]

const attributeNameMatch = /[\w:]/

export function parseHtml(char: string, parser: NoteParser): boolean {
	if (char === '<' && parser.feed.peek().match(attributeNameMatch)) {
		const { feed, builder } = parser
		const hasBlockFormat = builder.hasOpenBlockFormat('html')
		
		parser.commitSpan(hasBlockFormat ? CONTENT_ATTRIBUTES : null, 0) // Previous content

		if (!hasBlockFormat) {
			builder.addOpenBlockFormat('html', {
				inline_code: 'html'
			})
			builder.addOpenLineFormat('html', {
				html: true
			})
		}

		parser.commitSpan(PUNCTUATION_ATTRIBUTES)

		feed.next()
		const wordEnd = feed.findWhile(attributeNameMatch)
		const tag = feed.substring(feed.index, wordEnd + 1)
		feed.index = wordEnd

		parser.commitSpan({ code_syntax: 'tag' })

		// An outer context for the entire element
		parser.pushContext({
			indent: '',
			type: ParsingContextType.Block,
			programs: [],
			exit: hasBlockFormat ? null : (_, __, parser) => {
				parser.builder.dropOpenBlockFormat('html')
				// We want to drop the line format but ensure that this line is marked as html
				parser.builder.dropOpenLineFormat('html')
				parser.lineData.html = true
			}
		})
		// An inner context for parsing the tag's content
		parser.pushContext({
			indent: '',
			type: ParsingContextType.Block,
			programs: tagParsingPrograms
		})
		return true
	}
	return false
}

function parseCloseTag(char: string, parser: NoteParser): boolean {
	if (char === '<' && parser.feed.peek() === '/' && parser.feed.peek(2).match(attributeNameMatch)) {
		const { feed, builder } = parser

		parser.commitSpan(null, 0) // Previous content

		feed.next()
		parser.commitSpan(PUNCTUATION_ATTRIBUTES)

		feed.next()
		const wordEnd = feed.findWhile(attributeNameMatch)
		const tag = feed.substring(feed.index, wordEnd + 1)
		feed.index = wordEnd

		parser.commitSpan({ code_syntax: 'tag' })

		const { foundMatch, contentCount } = feed.findNext('>', false)

		if (contentCount > 0) {
			feed.nextByLength(contentCount)
			parser.commitSpan(ERROR_ATTRIBUTES, 0)
		}

		if (foundMatch) {
			parser.commitSpan(PUNCTUATION_ATTRIBUTES)
		}

		parser.popContext() // The content parser
		parser.popContext() // The outer tag parser

		return true
	}
	return false
}

function badOpenBracket(char: string, parser: NoteParser): boolean {
	if (char === '<') {
		parser.commitSpan(null, 0)
		parser.commitSpan(ERROR_ATTRIBUTES)
		return true
	}
	return false
}

function badCloseBracket(char: string, parser: NoteParser): boolean {
	if (char === '>') {
		parser.commitSpan(null, 0)
		parser.commitSpan(ERROR_ATTRIBUTES)
		return true
	}
	return false
}

const badTokenBreakMatch = /[^\w\d_\-=<>]/
function badTokenParser(char: string, parser: NoteParser): boolean {
	if (char.match(badTokenBreakMatch)) {
		parser.commitSpan(ERROR_ATTRIBUTES, 0)
		parser.feed.nextByLength(-1) // Rewind so that this can be parsed in a different way
		parser.popContext()
		return true
	}
}

function consumeWhitespace(char: string, parser: NoteParser): boolean {
	if (char.match(WHITESPACE_MATCH)) {
		const { feed } = parser
		feed.index = feed.findWhile(WHITESPACE_MATCH, feed.index + 1)
		parser.commitSpan(WHITESPACE_ATTRIBUTES)
		return true
	}
	return false
}

function parseTagInternals(char: string, parser: NoteParser): boolean {
	const { feed } = parser
	const start = feed.index

	const wordEnd = feed.findWhile(/\w/)
	if (wordEnd >= start) {
		parser.commitSpan(null, 0)
		// Consume & mark word
		feed.nextByLength(wordEnd - start)
		parser.commitSpan({ code_syntax: 'attribute attr-name' })
		return true
	}

	if (char === '=') {
		parser.commitSpan(null, 0)
		parser.commitSpan(PUNCTUATION_ATTRIBUTES)
		parser.pushContext({
			indent: '',
			type: ParsingContextType.Block,
			programs: valueParsingPrograms
		})
		return true
	}

	if (char === '>') {
		parser.commitSpan(null, 0)
		parser.commitSpan(PUNCTUATION_ATTRIBUTES)
		// Remove the attribute parser context
		parser.popContext()
		// Push a context for the contents of the block
		parser.pushContext({
			indent: '',
			type: ParsingContextType.Block,
			programs: contentParsingPrograms
		})
		return true
	}

	if (char === '/') {
		if (feed.checkFor('/>', false)) {
			parser.commitSpan(null, 0)
			feed.next()
			parser.commitSpan(PUNCTUATION_ATTRIBUTES)
			// Remove the attribute parser
			parser.popContext()
			// Remove the element parser
			parser.popContext()
			return true
		}
		else {
			parser.commitSpan(null, 0)
			parser.commitSpan(ERROR_ATTRIBUTES)
			return true
		}
	}

	return false
}

function startValueParsing(char: string, parser: NoteParser): boolean {
	if (char === '"' || char === "'") {
		parser.popContext() // We are no longer seeking for a value
		parser.commitSpan(WHITESPACE_ATTRIBUTES, 0)
		parser.commitSpan(PUNCTUATION_ATTRIBUTES)
		parser.builder.addOpenBlockFormat('html_value', LITERAL_ATTRIBUTES)
		parser.pushContext({
			indent: '',
			type: ParsingContextType.Block,
			programs: char == '"' ? doubleQuoteValueParsingPrograms : quoteValueParsingPrograms
		})
		return true
	}
	return false
}

function makeValueParser(target: string): ParsingProgram {
	return (char: string, parser: NoteParser) => {
		if (char === target) {
			parser.commitSpan(null, 0)
			parser.builder.dropOpenBlockFormat('html_value')
			parser.commitSpan(PUNCTUATION_ATTRIBUTES)
			parser.popContext() // Value parsing is complete
			return true
		}
		return false
	}
}
