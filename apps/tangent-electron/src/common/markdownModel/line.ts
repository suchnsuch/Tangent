import { Line, deltaToText, EditorRange, TextDocument } from '@typewriter/document'
import noteTypeset from './typewriterTypes'
import { getGlyphForNumber, ListForm, matchList } from './list'
import { indentMatcher } from './matches'
import NoteParser from './NoteParser'

export interface IndentDefinition {
	indent: string,
	indentSize?: number
}

/**
 * Gets the contents of the primary line formatting attribute
 * @param line 
 */
export function getLineFormatData(line: Line) {
	const attr = line.attributes
	for (const type of noteTypeset.lines) {
		const typeName = typeof type === 'string' ? type : type.name
		const value = attr[typeName]
		if (value) return value
	}
}

export function lineHasMultiLineContext(line: Line) {
	if (line.attributes.list) {
		return line.attributes.list.form !== ListForm.Unordered ? 'list' : undefined
	}
	return undefined
}

export function lineIsMultiLineFormat(line: Line) {
	if ('code' in line.attributes ||
		'front_matter' in line.attributes ||
		'math' in line.attributes ||
		'html' in line.attributes
	) {
		return true
	}
	return false
}

/**
 * Gets the line formatting prefix from a given line
 * @param line The line to extract from.
 * @param forNextLine Whether the returned prefix should be the one that logically follows the provided line.
 */
export function getLineFormattingPrefix(line: Line, forNextLine = false): string {
	const attr = line.attributes
	const lineString = deltaToText(line.content)
	if (attr.header) {
		if (forNextLine) {
			return ''
		}
		
		const match = lineString.match(/^#+ /)
		if (match) {
			return match[0]
		}
	}
	else if (attr.blockquote) {
		const match = lineString.match(/^(> ?)+/)
		if (match) {
			let result = match[0]
			if (!result.endsWith(' ')) {
				result += ' '
			}
			return result
		}
	}
	else if (attr.list) {
		const match = matchList(lineString)
		if (match) {
			let nextGlyph = match.glyph
			if (forNextLine) {
				if (ListForm.isNumeric(match.form)) {
					// Increment the number from the current value
					nextGlyph = getGlyphForNumber(match.form, match.index + 1)
				}
				if (match.todoState !== undefined) {
					nextGlyph = nextGlyph.replace(/\[[x-]?\]/, '[ ]')
				}
			}

			// Reconstruct list start
			return match.indent + nextGlyph + ' '
		}
	}
	else {
		const match = lineString.match(indentMatcher)
		if (match) {
			return match[0]
		}
	}
	return ''
}

export function getActiveSentenceRange(doc: TextDocument, line: Line, selection: EditorRange): EditorRange {
	const lineRange = doc.getLineRange(line)
	const text = doc.getText(lineRange)
	const [lineStart, lineEnd] = lineRange
	const from = selection[0] - lineStart
	const to = selection[1] - lineStart
	
	let start = lineStart
	let end = lineEnd

	const matches = text.matchAll(/([\.\?\!]["']?)\s+/g)
	if (matches) {
		const matchList = [...matches]

		let startMatch: RegExpMatchArray = null
		let startLengthOffset = 0
		for (let i = 0; i < matchList.length; i++) {
			const match = matchList[i]
			const offset = match[1].length
			if (match.index + offset < from) {
				startMatch = match
				startLengthOffset = offset
			}
			else break // thereby grabbing the closest one
		}

		if (startMatch) {
			start = lineStart + startMatch.index + startLengthOffset // Start just after the period
		}

		let endMatch: RegExpMatchArray = null
		let endLengthOffset = 0
		for (let i = matchList.length - 1; i >= 0; i--) {
			const match = matchList[i]
			const offset = match[1].length
			if (match.index + offset >= to) {
				endMatch = match
				endLengthOffset = offset
			}
			else break // thereby grabbing the closest one
		}

		if (endMatch) {
			end = lineStart + endMatch.index + endLengthOffset // Include just the period
		}
	}

	return [start, end]
}

export function lineFormatEscapeMode(line: Line) {
	const attr = line.attributes
	if (attr.blockquote) {
		return 'double'
	}
	else if (attr.list) {
		return 'single'
	}
	return 'none'
}

const horizontalRuleText = /^((- *){3,}|(\* *){3,}|(_ *){3,})$/
export function parseHorizontalRule(char: string, parser: NoteParser): boolean {
	if (parser.isStartOfContent && (char === '_' || char === '-' || char === '*')) {
		const line = parser.feed.getLineText()
		if (line.match(horizontalRuleText)) {
			parser.feed.nextByLength(line.length)
			parser.commitSpan({ line_format: true, hidden: true }, 0)
			parser.lineData.horizontal_rule = true
			return true
		}
	}
	return false
}

export function parseBlockquote(char: string, parser: NoteParser): boolean {
	if (char !== '>' || !parser.isStartOfContent) return false

	const { feed } = parser
	let blockDepth = 0
	while (feed.currentChar === '>') {
		blockDepth++
		const next = feed.peek()
		if (next === ' ' && feed.peek(2) === '>') {
			feed.next()
		}
		feed.next()
	}

	parser.lineData.blockquote = blockDepth
	parser.commitSpan({ line_format: true, hidden: true }, 0)
	return true
}
