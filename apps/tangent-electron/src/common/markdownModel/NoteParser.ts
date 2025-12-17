import { AttributeMap, Delta } from '@typewriter/document'
import { parseDocument as parseYaml } from 'yaml'
import CharacterFeeder from './CharacterFeeder'
import LinesBuilder from './LinesBuilder'
import { StructureData, StructureType } from 'common/indexing/indexTypes'
import { parseBackslashEscape, parseComment, parseEmojiHighlight, parseEmphasis, parseHighlight, parseStrikethrough } from './formatting'
import { parseHeader } from './header'
import { IndentDefinition, parseBlockquote, parseHorizontalRule } from './line'
import { parseListItem } from './list'
import { parseInlineMath, parseMathBlock } from './math'
import { parseLink, parseRawLink } from './links'
import { ParsingContext, ParsingContextType, ParsingProgram } from './parsingContext'
import { parseTag } from './tag'
import { parseCodeBlock, parseInlineCode, readCodeLines } from './code'
import { getLanguage } from './codeSyntax'
import { parseHtml } from './html'

const blockPrograms: ParsingProgram[] = [
	parseHeader,
	parseHorizontalRule,
	parseBlockquote,
	parseListItem,
	parseCodeBlock,
	parseMathBlock
]

const inlineObjectPrograms = [
	parseInlineMath,
	parseLink,
	parseRawLink,
	parseTag,
	parseComment,
	parseHtml
]

// i.e. programs that could be inside e.g. a link
const inlineFormattingPrograms: ParsingProgram[] = [
	parseInlineCode,
	parseEmphasis,
	parseStrikethrough,
	parseHighlight,
	parseEmojiHighlight,
	parseBackslashEscape
]

const basePrograms = [
	...blockPrograms,
	...inlineObjectPrograms,
	...inlineFormattingPrograms
]

export interface MarkdownParsingOptions {
	filepath?: string

	/** Instructs the parser to output content as formatted retains */
	asFormatting?: boolean
	/** Pulls in context for links */
	detailedLinks?: boolean
	autoEmbedRawLinks?: boolean

	/** When true, makes it possible to apply emphasis in the middle of words with underscores */
	allowInterTextUnderscoreFormatting?: boolean

	/** When true, HTML sections may be started with non-standard HTML tag names */
	allowUnknownHTMLTags?: boolean

	documentStartLine?: number
	documentEndLine?: number
}

export default class NoteParser {
	readonly feed: CharacterFeeder
	readonly builder: LinesBuilder

	contexts: ParsingContext[] = []

	readonly options: MarkdownParsingOptions
	readonly detailedLinks: boolean
	readonly autoEmbedRawLinks: boolean
	readonly filepath: string

	readonly structure: StructureData[] = []

	readonly errors: any[] = []
	awaiting: any[] = null

	protected _isStartOfLine = false
	// IE the first non-whitespace character on the line
	protected _isStartOfContent = false

	protected spanStart: number
	protected _lineStart: number
	protected _lineData: any

	constructor(feed: CharacterFeeder, options?: MarkdownParsingOptions) {
		this.feed = feed
		this.builder = new LinesBuilder(options)

		this.options = options
		this.detailedLinks = options?.detailedLinks ?? false
		this.autoEmbedRawLinks = options?.autoEmbedRawLinks ?? true
		this.filepath = options?.filepath

		this.spanStart = 0
		this._lineStart = 0
		this._lineData = {}
	}

	// TODO: Remove once https://github.com/vitejs/vite/issues/14048 is resolved
	get defaultPrograms() { return basePrograms }
	get defaultBlockPrograms() { return blockPrograms }
	get defaultInlineObjectPrograms() { return inlineObjectPrograms }
	get defaultInlineFormattingPrograms() { return inlineFormattingPrograms }

	get lineStart() { return this._lineStart }
	get isStartOfContent() { return this._isStartOfContent }
	get lineData() { return this._lineData }
	
	parse() {
		this._isStartOfLine = true

		this.contexts.push({
			type: ParsingContextType.Block,
			indent: '',
			programs: basePrograms
		})

		if (this.feed.isStartOfDocument) {
			parseFrontMatter(this)
		}

		for (;
			this.feed.hasMore(this.contexts.at(-1).extendContext ?? false);
			this.moveNext(true, this.contexts.at(-1).extendContext ?? false)) {
			
			if (this._isStartOfLine) {
				// Parse indentation
				parseIndent(this.feed.currentChar, this)
				this._isStartOfContent = true
			}

			if (!this.feed.hasMore(this.contexts.at(-1).extendContext ?? false)) {
				// No more processing to do
				break
			}

			const context = this.contexts.at(-1)
			const char = this.feed.currentChar

			for (const program of context.programs) {
				const result = program(char, this, context)
				if (result === true) break
			}
		}

		if (this._isStartOfLine) {
			// Parsing stopped on an empty newline.
			// Need to drop all contexts that are indented.
			while (this.contexts.at(-1).indent !== '') {
				this.popContext(this.lineStart - 1)
			}
			// Also need to inject blank indent data
			this.lineData.indent = {
				indent: '',
				indentSize: 0
			}
		}

		// Push the last line
		this.commitLine()

		// Let contexts clean themselves out
		while (this.contexts.length) {
			this.popContext()
		}
	}

	moveNext(shouldCommitLine=true, hard=false) {
		this._isStartOfLine = false
		this._isStartOfContent = false
		const char = this.feed.currentChar
		if (char === '\n' || (char === undefined && this.feed.hasMore(hard))) {
			if (shouldCommitLine) this.commitLine()
			this._isStartOfLine = true
			this._lineStart = this.feed.index + 1
			this.spanStart = this._lineStart
		}
		this.feed.next(1, hard)
	}

	commitLine() {
		if (!(this.builder.spans.length === 0 && this.spanStart === this.feed.index)) {
			// Avoid committing the newline character
			this.commitSpan(null, 0, 1)
		}
		this.builder.buildLine(this._lineData)
		this._lineData = {}
		this.spanStart = this.feed.index + 1

		while (this.contexts.at(-1).type === ParsingContextType.Inline) {
			this.popContext(this._lineStart - 1)
		}
	}

	commitSpan(attributes: AttributeMap, spanOffset=this.feed.currentStepLength, nextStartOffset=0) {
		let content = this.feed.text.substring(this.spanStart, this.feed.index + spanOffset)
		if (content === '\n') {
			console.error('building span with "\\n"!', {
				content,
				index: this.feed.index,
				spanStart: this.spanStart,
				spanOffset,
				fullText: this.feed.text
			})
		}
		this.builder.addSpan(content, attributes)

		this.spanStart = this.feed.index + spanOffset + nextStartOffset
	}

	// The presence of this is a pretty nasty leak of abstraction
	setSpanStart(value: number) {
		this.spanStart = value
	}

	pushStructure(data: StructureData) {
		this.structure.push(data)
	}
	
	pushContext(context: ParsingContext) {
		this.contexts.push(context)
	}

	popContext(lastIndex: number = this.feed.index) {
		const context = this.contexts.pop()
		if (context.exit) {
			context.exit(lastIndex, context, this)
		}
	}

	flagAwaiting(message: string) {
		if (!this.awaiting) this.awaiting = [message]
		else this.awaiting.push(message)
	}

	/**
	 * Gets the indent of the line currently being built
	 */
	getCurrentIndent(): IndentDefinition {
		return this.lineData.indent as IndentDefinition
	}
}

function parseIndent(char: string, parser: NoteParser) {
	const { feed } = parser
	
	let indentSize = 0
	let indent = ''

	const lastContext = parser.contexts.at(-1)

	while (true) {
		if (lastContext.indentBlock && lastContext.indent === indent) {
			// Allow contexts to specify their own sub-indent parsing behavior
			break
		}

		if (char === '\t') {
			indentSize += 8 // TODO: make tab width configurable
			indent += char
			char = feed.next()
		}
		else if (char === ' ') {
			indentSize++
			indent += char
			char = feed.next()
		}
		else {
			break
		}
	}

	if (indentSize) {
		// Encode the indent information into the line
		parser.lineData.indent = {
			indent,
			indentSize
		}

		// Mark the indent in the line formatting
		parser.commitSpan({
			line_format: 'indent',
			hidden: true
		}, 0)
	}
	else {
		parser.lineData.indent = {
			indent,
			indentSize
		}
	}
	
	// Drop all previously pushed contexts that don't start with this indent
	while (!indent.startsWith(parser.contexts.at(-1).indent)) {
		// The last index is the previous newline
		parser.popContext(parser.lineStart - 1)
	}
}

function parseFrontMatter(parser: NoteParser): boolean {
	const { feed, builder } = parser

	if (!feed.checkFor('---')) return false

	parser.commitSpan({
		line_format: true,
		hidden: true
	}, 1)

	builder.addOpenLineFormat('front_matter', {
		front_matter: true
	})

	parser.moveNext()
	parser.moveNext()

	const startIndex = feed.index

	const { allCode, hitEnd } = readCodeLines(parser, getLanguage('yaml'), '---')
	
	// Yaml doesn't like tabs for indentation
	let translated = allCode.replace(/\t+/g, '    ')
	const document = parseYaml(translated, {
		strict: false
	})

	for (const error of document.errors) {
		const delta = new Delta()
			.retain(startIndex + error.pos[0])
			.retain(error.pos[1] - error.pos[0], {
				error: error.toString()
			})

		builder.applyFormatting(delta)
	}

	for (const warning of document.warnings) {
		const delta = new Delta()
		.retain(startIndex + warning.pos[0])
		.retain(warning.pos[1] - warning.pos[0], {
			warning: warning.toString()
		})

		builder.applyFormatting(delta)
	}

	try {
		const data = document.toJS()

		parser.pushStructure({
			type: StructureType.FrontMatter,
			start: 0,
			end: feed.index,
			data
		})

		if (data) {
			// Push links
			if (data.tags) {
				const tags = data.tags
				if (typeof tags === 'string') {
					// Technically not correct, but we'll allow it
					parser.pushStructure({
						type: StructureType.Tag,
						form: 'front-matter',
						start: 0, end: 0,
						href: tags
					})
				}
				else if (Array.isArray(tags)) {
					for (const item of tags) {
						if (typeof item === 'string') {
							parser.pushStructure({
								type: StructureType.Tag,
								form: 'front-matter',
								start: 0, end: 0,
								href: item
							})
						}
					}
				}
			}
		}
	}
	catch (e) {
		// Cannot reliably pull out positional data. Mark the whole block as bad.
		parser.errors.push('Could not translate YAML document to JS: ' + e)

		const delta = new Delta()
			.retain(startIndex)
			.retain(feed.index - startIndex, {
				error: 'message' in e ? e.message : e.toString()
			})
		
		builder.applyFormatting(delta)
	}

	if (hitEnd) {
		parser.commitSpan({
			line_format: true,
			hidden: true
		}, 0)
		builder.dropOpenLineFormat('front_matter')
		parser.lineData.front_matter = true
		parser.lineData.end = true

		if (feed.hasMore()) parser.moveNext()
	}
}
