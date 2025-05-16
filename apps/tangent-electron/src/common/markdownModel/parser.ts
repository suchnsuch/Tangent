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
import NoteParser, { MarkdownParsingOptions } from './NoteParser'

export { MarkdownParsingOptions } from './NoteParser'

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

