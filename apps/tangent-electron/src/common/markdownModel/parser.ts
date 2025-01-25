import { TextDocument, Line, AttributeMap } from '@typewriter/document'
import { ConnectionInfo, EmbedInfo, HrefFormedLink, HrefLink, LinkInfo, StructureData, StructureType, TagInfo } from '../indexing/indexTypes'

import { parse as parseYaml } from 'yaml'

import CharacterFeeder from './CharacterFeeder'
import DocumentFeeder from './DocumentFeeder'
import { horizontalRuleText } from './matches'
import { ListDefinition, ListForm, matchList } from './list'
import { getLanguage, parseTokens, tokenize } from './codeSyntax'
import LinesBuilder from './LinesBuilder'
import { lineIsMultiLineFormat } from './line'
import { matchMarkdownLink, matchWikiLink } from './links'
import { safeHeaderLine } from './header'
import { matchTag, TagSectionData } from './tag'
import { tagNameSeperatorMatch } from '@such-n-such/tangent-query-parser'
import { highlightEmojiMatch, highlightEmojiToClassDescriptor } from './formatting'
import NoteParser from './NoteParser'

function isWhitespace(char: string) {
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

const backslashEscapes = [
	'_', '*', '-', '+', '$', '#', "~", '`', '[', ']', '(', ')'
]

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

export function markdownToTextDocument(text: string): TextDocument {
	return new TextDocument(parseMarkdown(text).lines)
}

export interface MarkdownParsingOptions {
	filepath?: string

	/** Instructs the parser to output content as formatted retains */
	asFormatting?: boolean
	/** Pulls in context for links */
	detailedLinks?: boolean
	parseFrontMatter?: boolean
	autoEmbedRawLinks?: boolean

	documentStartLine?: number
	documentEndLine?: number
}

export function parseMarkdown(source: string | TextDocument, options?: MarkdownParsingOptions) {
	let feed: CharacterFeeder = null
	if (typeof source === 'string') {
		feed = new CharacterFeeder(source)
	}
	else {

		let startLineIndex = options.documentStartLine ?? 0
		let startLine = source.lines[startLineIndex]
		let endLineIndex = options.documentEndLine ?? source.lines.length - 1
		let endLine = source.lines[endLineIndex]

		const multiLine = startLineIndex !== endLineIndex

		// Code and other multi-line formatting needs to comprehend the whole thing
		// Multi-line text can be pasted with no context, so adjacent context needs to be found
		if (lineIsMultiLineFormat(startLine) || multiLine) {
			while (startLineIndex > 0) {
				const previousIndex = startLineIndex - 1
				const previousLine = source.lines[previousIndex]
				if (lineIsMultiLineFormat(previousLine)) {
					startLineIndex = previousIndex
					startLine = previousLine
				}
				else {
					break
				}
			}
		}

		// Code and other multi-line formatting needs to comprehend the whole thing
		// Always check the next line since a deletion could cause previous multi-line blocks to reflow
		// Multi-line text can be pasted with no context, so adjacent context needs to be found
		while (endLineIndex < source.lines.length - 1) {
			const nextIndex = endLineIndex + 1
			const nextLine = source.lines[nextIndex]
			if (lineIsMultiLineFormat(nextLine)) {
				endLineIndex = nextIndex
				endLine = nextLine
			}
			else {
				break
			}
		}

		feed = new DocumentFeeder(source, startLineIndex, endLineIndex)
	}

	const parser = new NoteParser(feed, options)
	parser.parse()

	let result: ParseResult = {
		lines: parser.builder.lines,
		structure: parser.structure,
		errors: parser.errors,
		awaiting: parser.awaiting
	}

	if (feed instanceof DocumentFeeder) {
		result.startLineIndex = feed.startLine
	}

	return result
}

export function parseMarkdown_legacy(source: string | TextDocument, options?: MarkdownParsingOptions) {

	const outputFormattingRetains = options?.asFormatting ?? false
	const detailedLinks = options?.detailedLinks ?? false
	const filepath = options?.filepath

	const builder = new LinesBuilder({
		asFormatting: outputFormattingRetains
	})

	let spanStart = 0
	let spanData:AttributeMap = {}

	let lineData:any = {}

	// Index values
	let structure: StructureData[] = []

	let errors: any[] = []

	// Processing values
	let awaiting: string[] = null
	function flagAwaiting(message: string) {
		if (!awaiting) awaiting = [message]
		else awaiting.push(message)
	}

	let isStartOfLine = true
	let lineStartIndex = 0

	let feed: CharacterFeeder = null
	let isStartOfDoc = true
	if (typeof source === 'string') {
		feed = new CharacterFeeder(source)
	}
	else {

		let startLineIndex = options.documentStartLine ?? 0
		let startLine = source.lines[startLineIndex]
		let endLineIndex = options.documentEndLine ?? source.lines.length - 1
		let endLine = source.lines[endLineIndex]

		const multiLine = startLineIndex !== endLineIndex

		// Code and other multi-line formatting needs to comprehend the whole thing
		// Multi-line text can be pasted with no context, so adjacent context needs to be found
		if (lineIsMultiLineFormat(startLine) || multiLine) {
			while (startLineIndex > 0) {
				const previousIndex = startLineIndex - 1
				const previousLine = source.lines[previousIndex]
				if (lineIsMultiLineFormat(previousLine)) {
					startLineIndex = previousIndex
					startLine = previousLine
				}
				else {
					break
				}
			}
		}

		// Code and other multi-line formatting needs to comprehend the whole thing
		// Always check the next line since a deletion could cause previous multi-line blocks to reflow
		// Multi-line text can be pasted with no context, so adjacent context needs to be found
		while (endLineIndex < source.lines.length - 1) {
			const nextIndex = endLineIndex + 1
			const nextLine = source.lines[nextIndex]
			if (lineIsMultiLineFormat(nextLine)) {
				endLineIndex = nextIndex
				endLine = nextLine
			}
			else {
				break
			}
		}

		feed = new DocumentFeeder(source, startLineIndex, endLineIndex)
		isStartOfDoc = startLineIndex === 0
	}

	function commitSpan(spanOffset=feed.currentStepLength, nextStartOffset=0) {
		// Include everything up until the current character
		let content = feed.text.substring(spanStart, feed.index + spanOffset)
		if (content === '\n') {
			console.error('building span with \n!', {
				content,
				index: feed.index,
				spanStart,
				spanOffset,
				fullText: feed.text
			})
		}
		builder.addSpan(content, spanData)
		
		spanData = {}
		spanStart = feed.index + spanOffset + nextStartOffset
	}

	function commitLine() {
		if (!(builder.spans.length == 0 && spanStart === feed.index)) {
			commitSpan(0, 1)
		}
		builder.buildLine(lineData)
		lineData = {}
		spanData = {}
		spanStart = feed.index + 1
	}

	function moveNext(shouldCommitLine=true, hard=false) {
		isStartOfLine = false
		if (feed.currentChar === '\n') {
			if (shouldCommitLine) commitLine()
			isStartOfLine = true
			lineStartIndex = feed.index + 1
			spanStart = lineStartIndex
		}
		feed.next(1, hard)
	}

	function readCodeLinesUntil(language: string, end: string) {
		let realLanguage = getLanguage(language)
		if (realLanguage === 'Loading') {
			flagAwaiting(language)
			realLanguage = null
		}

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
				commitSpan(0)
			}

			if (feed.hasMore(true)) {
				// Line breaks need to be inserted manually
				allCode += '\n'

				if (!realLanguage) {
					commitLine()
				}
				
				moveNext(false, true)
			}
		}

		// Close out the code
		if (realLanguage) {
			const tokens = tokenize(allCode, realLanguage)
			if (!tokens) {
				console.error('No tokens for', realLanguage)
			}
			parseTokens(tokens, builder)

			// This code is touchy. Make sure you run tests to confirm
			if (hitEnd) {
				// Reset the span start to the _start_ of the `end` line
				// This lets the caller decide how to format it
				spanStart = feed.index - line.length
			}
			else {
				// The end of parsing will push the last line
				// but we don't want to duplicate the last line
				spanStart = feed.index
			}
		}

		return {
			allCode,
			hitEnd
		}
	}

	// Check for YAML front-matter
	if (isStartOfDoc) {
		if (feed.checkFor('---')) {
			spanData.line_format = true
			spanData.hidden = true
			commitSpan(1)

			builder.addOpenLineFormat('front_matter', {
				front_matter: true
			})

			moveNext()
			moveNext()

			const { allCode, hitEnd } = readCodeLinesUntil(getLanguage('yaml'), '---')

			if (options?.parseFrontMatter) {

				// Yaml doesn't like tabs for indentation
				let translated = allCode.replace(/\t+/g, '    ')
				let data: any = null
				try {
					data = parseYaml(translated, {
						strict: false
					})
				}
				catch (e) {
					// TODO: make issues user-facing
					errors.push(e)
				}

				structure.push({
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
							structure.push({
								type: StructureType.Tag,
								form: 'front-matter',
								start: 0, end: 0,
								href: tags
							})
						}
						else if (Array.isArray(tags)) {
							for (const item of tags) {
								if (typeof item === 'string') {
									structure.push({
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

			if (hitEnd) {
				spanData.line_format = true
				spanData.hidden = true
				commitSpan(0)
				builder.dropOpenLineFormat('front_matter')
				lineData.front_matter = true

				if (feed.hasMore()) moveNext()
			}
		}
	}

	for (; feed.hasMore(); moveNext()) {
		let char = feed.currentChar

		if (isStartOfLine) {
			if (char === '#') {
				// Handle headers
				const start = feed.index
				let count = feed.consumeSequentialCharacters('#')
				if (feed.peek() === ' ') {
					feed.next()
					lineData.header = count

					spanData.line_format = true
					if (feed.peek() !== '\n') {
						spanData.hidden = true
					}
					commitSpan()

					const line = feed.getLineText(start)

					structure.push({
						type: StructureType.Header,
						level: count,
						text: safeHeaderLine(line),
						start,
						end: start + line.length
					})

					continue
				}
			}
			else if (char === '_' || char === '-' || char === '*') {
				// Handle horizontal rules
				let line = feed.getLineText()
				if (line.match(horizontalRuleText)) {
					spanData.hidden = true
					spanData.line_format = true
					feed.nextByLength(line.length)
					commitSpan(0)
					lineData.horizontal_rule = true
					continue
				}
			}
			else if (char === '>') {
				// Handle block quote
				let blockDepth = 0
				while (feed.currentChar === '>') {
					blockDepth++
					const next = feed.peek()
					if (next === ' ' && feed.peek(2) === '>') {
						feed.next()
					}
					feed.next()
				}

				lineData.blockquote = blockDepth
				spanData.line_format = true
				spanData.hidden = true
				commitSpan(0)
				continue
			}
			else if (char === '`' && feed.checkFor('```')) {
				// Handle code blocks
				spanData.line_format = 'code'
				spanData.hidden = true
				spanData.start = true
				commitSpan()

				let codeFormat = feed.getLineText(feed.index + 1, true).trim()
				spanData.line_format = 'code'
				spanData.hiddenGroup = true
				spanData.start = true
				commitSpan(0)

				builder.addOpenLineFormat('code', {
					code: codeFormat || true
				})

				moveNext()

				//let language = getLanguage(codeFormat)
				const { hitEnd } = readCodeLinesUntil(codeFormat, '```')
				
				if (hitEnd) {
					spanData.line_format = 'code'
					spanData.hidden = true
					spanData.end = true
					commitSpan(0)
					builder.dropOpenLineFormat('code')
					
					lineData.code = codeFormat || true

					if (feed instanceof DocumentFeeder && !feed.hasMore()) {
						feed.injectAdjacentLinesWhile(line => 'code' in line.attributes)
					}
				}
				
				continue
			}
			
			// Find indents
			let indentSize = 0
			let indentChars = 0
			while (true) {
				if (char === '\t') {
					indentSize += 8 // TODO: make tab width configurable
					indentChars++
					char = feed.next()
				}
				else if (char === ' ') {
					indentSize += 1
					indentChars++
					char = feed.next()
				}
				else {
					break
				}
			}

			if (indentSize) {
				// Encode the indent
				lineData.indent = {
					indent: feed.substring(feed.index - indentChars, feed.index),
					indentSize
				}

				// Add the indent to the line formatting
				spanData.line_format = 'indent'
				spanData.hidden = true
				commitSpan(0)
			}
			else {
				lineData.indent = {
					indent: '',
					indentSize
				}
			}

			if (char == '$' && feed.checkFor('$$', false)) {

				const remainingContent = feed.getLineText(feed.index + 2)
				if (!remainingContent) {
					// Interpret as math block
					spanData.line_format = 'math'
					spanData.hidden = true
					spanData.start = true
					feed.getLineText(feed.index + 1, true)
					commitSpan(0)
					
					// Declare here so it can be updated after the fact
					const mathContent = {} as any

					builder.addOpenLineFormat('math-block', {
						math: mathContent,
						hidden: true
					})

					moveNext() // Jump the new line

					const { hitEnd, allCode } = readCodeLinesUntil('latex', '$$')

					if (hitEnd) {
						spanData.line_format = 'math'
						spanData.hidden = true
						spanData.end = true
						commitSpan(0)

						builder.dropOpenLineFormat('math-block')
						lineData.math = mathContent
						lineData.hidden = true
					}

					mathContent.source = allCode

					if (feed instanceof DocumentFeeder && !feed.hasMore()) {
						feed.injectAdjacentLinesWhile(line => 'math' in line)
					}

					continue
				}
				// Otherwise, it's an inline math expression that starts with `$$`, supported for legacy reasons
			}

			const line = feed.getLineText()
			const listDetail = matchList(line)
			if (listDetail) {
				const start = feed.index
				if (listDetail.todoState === undefined) {
					// IMPROVE: A dirty hack to make the delta format compose
					listDetail.todoState = null
				}
				else {
					structure.push({
						type: StructureType.Todo,
						start,
						end: start + line.length,
						state: listDetail.todoState,
						text: line.substring(ListDefinition.length(listDetail))
					})
				}

				// Encode the list
				spanData.line_format = 'list'
				spanData.hiddenGroup = true
				spanData.list_format = listDetail

				lineData.list = listDetail

				// Consume the glyph
				feed.nextByLength(listDetail.glyph.length - 1)

				commitSpan()

				continue
			}
		}

		if (char === undefined) {
			// Jump out immediately
			break
		}
		else if (char === '`') {
			// Handle inline code
			let start = feed.index
			let startCount = feed.consumeSequentialCharacters(char)
			let formatString = feed.text.substring(start, feed.index + 1)

			// Close previous spans
			commitSpan(-startCount+1)

			spanData.start = true
			spanData.hidden = true
			spanData.hiddenGroup = true
			spanData.inline_code = true
			commitSpan()

			if (feed.peekLastNonFormatCharacter(start) === ' ') {
				spanData.afterSpace = true
			}

			// Start consuming content
			feed.next()
			spanData.inline_code = true
			spanData.hiddenGroup = true
			
			const { foundMatch } = feed.consumeUntil(formatString)

			if (foundMatch) {
				if (feed.peekNextNonFormatCharacter() === ' ') {
					spanData.beforeSpace = true
				}
				commitSpan(-startCount+1)

				spanData.end = true
				spanData.hidden = true
				spanData.hiddenGroup = true
				spanData.inline_code = true
				commitSpan()
			}
			else {
				commitSpan(0)
			}
		}
		else if (char === '_' || char === '*') {
			// Handle bold/italic
			let start = feed.index
			let leftTouchingText = !isWhitespace(feed.peek(-1))
			let count = feed.consumeSequentialCharacters(char, 3)
			let rightTouchingText = !isWhitespace(feed.peek())

			if (leftTouchingText || rightTouchingText) {
				let formatString = feed.text.substring(start, feed.index + 1)
				
				if (builder.hasOpenFormat(formatString)) {
					commitSpan(-count+1)

					spanData.end = true
					spanData.hidden = true
					commitSpan()
					builder.dropOpenFormat(formatString)
				}
				else {
					commitSpan(-count+1)

					builder.addOpenFormat(formatString, boldAndInlineFormatting(count))
					spanData.start = true
					spanData.hidden = true
					commitSpan()
				}
				continue
			}
		}
		else if (char === '/' && feed.checkFor('//', false)) {
			commitSpan(0)
			// Handle Comments
			// Clear all old open formats. Comments defeat everything
			builder.openLineScopedFormats = {}
			builder.addOpenFormat('comment', {
				line_comment: true
			})

			// Mark the start
			// Grab the next '/'
			feed.next()
			// Grab the trailing space
			if (feed.peek() === ' ') feed.next()
			spanData.line_comment = 'start'
			spanData.hidden = true
			commitSpan()
		}
		else if (char === '[') {
			let line = feed.getLineText()
			const isEmbed = feed.peek(-1) === '!'

			// Check for a wiki link
			let wikiLinkInfo: LinkInfo | EmbedInfo = matchWikiLink(line, feed.index)
			if (wikiLinkInfo?.start === feed.index) {

				if (isEmbed) {
					// Need to handle the !
					commitSpan(-1)

					// An embed wraps a link to some other item
					const t_link: HrefFormedLink & { block: boolean } = {
						href: wikiLinkInfo.href,
						form: 'wiki',
						block: lineStartIndex === feed.index - 1
					}
					if (wikiLinkInfo.content_id) {
						t_link.content_id = wikiLinkInfo.content_id
					}
					if (wikiLinkInfo.text) {
						t_link.text = wikiLinkInfo.text
					}
					if (filepath) {
						t_link.from = filepath
					}

					builder.addOpenFormat('wiki-link', {
						t_embed: true,
						t_link,
						hiddenGroup: true,
						hidden: true,
						link_internal: true
					})

					spanData.start = true
					commitSpan(0)
				}
				else {
					commitSpan(0)

					const t_link: HrefFormedLink = {
						href: wikiLinkInfo.href,
						form: 'wiki'
					}

					// Avoiding adding the key unless the value exists
					// helps ensure normalized output
					if (wikiLinkInfo.text) {
						t_link.text = wikiLinkInfo.text
					}
					if (wikiLinkInfo.content_id) {
						t_link.content_id = wikiLinkInfo.content_id
					}
					if (filepath) {
						t_link.from = filepath
					}

					builder.addOpenFormat('wiki-link', { t_link })
				}

				if (detailedLinks) {
					wikiLinkInfo.context = feed.getLineText(lineStartIndex)
				}
				if (isEmbed) {
					wikiLinkInfo.start--
					// ew
					;(wikiLinkInfo as any).type = StructureType.Embed
				}
				structure.push(wikiLinkInfo)

				// Commit the `[[`
				feed.next()
				spanData.link_internal = true
				spanData.hiddenGroup = true
				// TODO: option to show/hide the open/close brackets for links
				spanData.hidden = true
				spanData.start = true
				spanData.spellcheck = false
				commitSpan()

				builder.addOpenFormat('wiki-link-internal', wikiLinkInfo.text || isEmbed ? {
					// There is custom link text. Hide href and other elements.
					link_internal: true,
					hidden: true
				} : {
					// No custom text. The link must stand alone.
					link_internal: true,
					hiddenGroup: true
				})
				
				let slashIndex = wikiLinkInfo.href.lastIndexOf('/')
				if (slashIndex >= 0) {
					// Hide the directory section of the link
					feed.next(slashIndex + 1)
					spanData.link_internal = 'href directory'
					spanData.spellcheck = false
					spanData.hidden = true
					commitSpan() // The directory section

					feed.nextByLength(wikiLinkInfo.href.length - slashIndex - 1)
				}
				else {
					feed.nextByLength(wikiLinkInfo.href.length)
				}

				// Close the href portion
				spanData.link_internal = 'href'
				spanData.spellcheck = false
				commitSpan()

				if (wikiLinkInfo.content_id != undefined) {
					// Mark and consume the `#`
					feed.next()
					spanData.link_internal = 'id hashtag'
					commitSpan()

					// Mark the rest of the id
					feed.nextByLength(wikiLinkInfo.content_id.length)
					spanData.link_internal = 'id name'
					spanData.spellcheck = false
					commitSpan()
				}
				
				builder.dropOpenFormat('wiki-link-internal')

				if (wikiLinkInfo.text != undefined) {
					// There is custom link text.
					// Chop off the '|'
					feed.next()
					spanData.hidden = true
					spanData.link_internal = true
					spanData.spellcheck = false
					commitSpan()

					feed.nextByLength(wikiLinkInfo.text?.length ?? 0)

					// Commit the visible text
					spanData.hiddenGroup = true
					spanData.link_internal = true
					commitSpan()
				}

				// Commit the `]]`
				feed.next(2)
				spanData.link_internal = true
				spanData.hiddenGroup = true
				// TODO: option to show/hide the open/close brackets for links
				spanData.hidden = true
				spanData.end = true
				spanData.spellcheck = false
				commitSpan()

				builder.dropOpenFormat('wiki-link')
			}
			else {
				const mdLinkInfo = matchMarkdownLink(line, feed.index)
				if (mdLinkInfo?.start === feed.index && (mdLinkInfo.text || isEmbed)) {
					if (isEmbed) {
						// Need to handle the !
						commitSpan(-1)

						const t_embed: HrefFormedLink & { block: boolean } = {
							href: mdLinkInfo.href,
							form: 'md',
							block: lineStartIndex === feed.index - 1
						}
						if (mdLinkInfo.text) {
							t_embed.text = mdLinkInfo.text
						}
						if (filepath) {
							t_embed.from = filepath
						}

						builder.addOpenFormat('md-link', {
							t_embed,
							hidden: true,
							hiddenGroup: true
						})

						spanData.link_internal = true
						spanData.start = true
						commitSpan(0)
					}
					else {
						commitSpan(0)

						const t_link: HrefFormedLink = {
							href: mdLinkInfo.href,
							form: 'md'
						}
						if (filepath) {
							t_link.from = filepath
						}

						builder.addOpenFormat('md-link', {
							t_link,
							hiddenGroup: true
						})
					}

					// Commit the `[`
					spanData.link_internal = true
					spanData.hidden = true
					spanData.start = true
					commitSpan()

					// Commit the text
					if (mdLinkInfo.text) {
						feed.nextByLength(mdLinkInfo.text?.length ?? 0)	
						spanData.link_internal = true
						commitSpan()
					}
					
					// Commit the `](` and link
					spanData.link_internal = true
					spanData.hidden = true

					feed.next(2)
					feed.nextByLength(mdLinkInfo.href.length)
					spanData.spellcheck = false
					commitSpan()

					// Commit the ending `)`
					feed.next()
					spanData.link_internal = true
					spanData.hidden = true
					spanData.end = true
					commitSpan()

					builder.dropOpenFormat('md-link')
				}
			}
		}
		else if (char === ':' && feed.checkFor('://', false)) {
			// Handle raw links
			const lastLetterIndex = feed.findWhile(/[A-Za-z]/, feed.index - 1, -1)

			commitSpan(lastLetterIndex - feed.index)

			feed.consumeUntil(' ')
			
			const t_link: HrefFormedLink = {
				href: feed.substring(lastLetterIndex, feed.index),
				form: 'raw'
			}

			spanData.t_link = t_link
			
			commitSpan(0)
		}
		else if (char === '#' && feed.peek().trim()) {
			// Handle tags
			
			// Tags should not start next to text
			if (feed.peek(-1).trim()) continue

			const line = feed.getLineText()
			const tagDefinition = matchTag(line)
			if (!tagDefinition) continue

			commitSpan(0)

			const start = feed.index

			builder.addOpenFormat('tag', {
				tag: tagDefinition.names,
				hiddenGroup: true
			})

			// Commit the #
			spanData.tag_internal = true
			spanData.hidden = true
			commitSpan()

			// Commit the sections
			let cumulativeName = ''
			for (let i = 0; i < tagDefinition.names.length; i++) {
				const name = tagDefinition.names[i]
				feed.nextByLength(name.length)
				cumulativeName += name
				spanData.tag_section = {
					name: cumulativeName,
					depth: i + 1,
					totalDepth: tagDefinition.names.length
				} as TagSectionData
				commitSpan()

				if (i < tagDefinition.names.length - 1) {
					// Consume the seperator
					spanData.tag_seperator = {
						prev: cumulativeName,
						next: cumulativeName + '--' + tagDefinition.names[i + 1],
						depth: i + 1
					}
					
					feed.next()
					commitSpan()

					cumulativeName += '--'
				}
			}

			if (feed.peek()?.match(tagNameSeperatorMatch)) {
				// Grab the seperator, but not as a section
				feed.next()
				spanData.tag_internal = true
				spanData.hiddenGroup = true
				commitSpan()
			}

			const tagInfo: TagInfo = {
				type: StructureType.Tag,
				form: 'tag',
				start,
				end: start + tagDefinition.length,
				href: tagDefinition.names.join('/')
			}

			if (detailedLinks) {
				tagInfo.context = feed.getLineText(lineStartIndex)
			}

			structure.push(tagInfo)

			builder.dropOpenFormat('tag')
		}
		else if (char === '~' && feed.checkFor('~~')) {
			// Handle strikethrough
			
			let leftTouchingText = !isWhitespace(feed.peek(-2))
			let rightTouchingText = !isWhitespace(feed.peek())

			if (leftTouchingText || rightTouchingText) {
				commitSpan(-1)
				if (leftTouchingText && builder.hasOpenFormat('strikethrough')) {
					spanData.hidden = true
					spanData.end = true
					commitSpan()
					builder.dropOpenFormat('strikethrough')
				}
				else if (rightTouchingText && !builder.hasOpenFormat('strikethrough')) {
					builder.addOpenFormat('strikethrough', {
						strikethrough: true,
						hiddenGroup: true
					})
					spanData.hidden = true
					spanData.start = true
					commitSpan()
				}
			}
		}
		else if (char === '=' && feed.checkFor('==')) {
			// Handle highlight

			let leftTouchingText = !isWhitespace(feed.peek(-2))
			let rightTouchingText = !isWhitespace(feed.peek())

			if (leftTouchingText || rightTouchingText) {
				commitSpan(-1)
				if (leftTouchingText && builder.hasOpenFormat('highlight')) {
					spanData.link_internal = true
					spanData.hidden = true
					commitSpan()
					builder.dropOpenFormat('highlight')
				}
				else if (rightTouchingText && !builder.hasOpenFormat('highlight')) {
					builder.addOpenFormat('highlight', {
						highlight: true,
						hiddenGroup: true
					})
					spanData.link_internal = true
					spanData.hidden = true
					commitSpan()
				}
			}
		}
		else if (char === '$') {
			// Handle inline(ish) math. Full math blocks are handled above.
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
						commitSpan(-token.length)
						const index = feed.index
						feed.next(findResult.contentCount + token.length - 1)
						spanData.math = {
							source: feed.substring(index, index + findResult.contentCount),
							isBlock
						}
						spanData.hidden = true
						commitSpan()
					}
				}
			}
		}
		else if (char.match(highlightEmojiMatch)) {
			// Handle color highlight
			let leftTouchingText = !isWhitespace(feed.peek(-char.length))
			let rightTouchingText = !isWhitespace(feed.peek())

			if (leftTouchingText || rightTouchingText) {
				commitSpan(0)
				if (leftTouchingText && builder.hasOpenFormat(char)) {
					spanData.link_internal = true
					spanData.hidden = true
					spanData.end = true
					commitSpan()
					builder.dropOpenFormat(char)
				}
				else if (rightTouchingText && !builder.hasOpenFormat(char)) {
					builder.addOpenFormat(char, {
						highlight: highlightEmojiToClassDescriptor(char),
						hiddenGroup: true
					})
					spanData.link_internal = true
					spanData.hidden = true
					spanData.start = true
					commitSpan()
				}
			}
		}
		else if (char === '\\' && backslashEscapes.indexOf(feed.peek()) >= 0) {
			// Handle backslash escapes
			// Close out previous content
			commitSpan(0)

			// Mark the backslash as hidden
			spanData.link_internal = true
			spanData.hidden = true
			commitSpan()

			// Consume the next character
			moveNext()
		}
	}

	// Push the last line
	commitLine()
	//console.log(lines.length == 1 ? lines[0] : lines)

	let result: ParseResult = {
		lines: builder.lines,
		structure,
		errors,
		awaiting
	}
	
	if (feed instanceof DocumentFeeder) {
		result.startLineIndex = feed.startLine
	}

	return result
}

interface ParseResult {
	lines: Line[]
	structure: StructureData[]
	errors?: any[] // TODO: Better errors
	awaiting?: string[]
	startLineIndex?: number
}

export function linkInfoToText(link: ConnectionInfo): string {
	let result = '[['
	if (link.type === StructureType.Embed) {
		result = '!' + result
	}
	result += link.href
	if (link.text) {
		result += '|'
		result += link.text
	}
	return result + ']]'
}

