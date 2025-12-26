import { TextDocument, Line } from '@typewriter/document'
import { type ConnectionInfo, type StructureData, StructureType } from '../indexing/indexTypes'
import CharacterFeeder from './CharacterFeeder'
import DocumentFeeder from './DocumentFeeder'
import { lineIsMultiLineFormat } from './line'
import NoteParser, { type MarkdownParsingOptions } from './NoteParser'

export type { MarkdownParsingOptions } from './NoteParser'

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

