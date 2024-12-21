import { StructureType, TodoState } from 'common/indexing/indexTypes'
import NoteParser from './NoteParser'

/**
 * This is a very complicated match
 * Selection group 1 hits the indentation
 * Selection group 2 contains the full glyph of either type (e.g. -, A.)
 * Selection group 3 hits the unordered list (e.g. -, +, *)
 * Selection group 4 contains the numeric glyph without a period (e.g. 1, A, b, IV)
 * 	5: Digits
 * 	6: lower-case single letters
 * 	7: upper-case single letters
 * 8: Checkbox on top of list
 */
export const listMatcher = /^([ \t]*)(([-+\*])|((\d+)|([a-z])|([A-Z]))\.)( \[[ x\-]?\])? /

/**
 * A subset of the above match
 * 1: Digits
 * 2: lower case alpha
 * 3: upper case alpha
 */
export const numericGlyphMatcher = /(\d+)|([a-z])|([A-Z])/

export const checkboxMatcher = /\[([x\- ]?)\]/

export enum ListForm {
	Unordered,
	Digit,
	AlphaUpper,
	AlphaLower
}

export namespace ListForm {
	export function isNumeric(form: ListForm) {
		switch (form) {
			case ListForm.Digit:
			case ListForm.AlphaLower:
			case ListForm.AlphaUpper:
				return true
			default:
				return false
		}
	}
}

export interface ListDefinition {
	/**
	 * The value pulled for the indent.
	 * Not necessarily correct unless this definition was pulled from a full line
	 */
	indent: string,
	form: ListForm,
	/** The character representation of the list item */
	glyph: string,
	/** The numeric value of the ordered glyph */
	index?: number,

	todoState?: TodoState
}

export namespace ListDefinition {
	export function length(definition: ListDefinition) {
		// Include an extra one because the last space is not included in the glyph
		return definition.indent.length + definition.glyph.length + 1
	}
	export function areEqual(a: ListDefinition, b: ListDefinition) {
		return a.indent === b.indent &&
			a.form === b.form &&
			a.glyph === b.glyph &&
			// Use `==` to allow undefined & null to match as those are equivalent for our purposes
			a.index == b.index &&
			a.todoState == b.todoState
	}
}

function checkboxGlyphToTodoState(glyph: string): TodoState {
	if (glyph.includes('x')) {
		return 'checked'
	}
	else if (glyph.includes('-')) {
		return 'canceled'
	}
	return 'open'
}

export function matchList(line: string): ListDefinition {
	const match = line.match(listMatcher)
	if (match) {

		const definition = {
			indent: match[1],
			glyph: match[2]
		} as Partial<ListDefinition>

		if (match[3]) {
			// Unordered list
			definition.form = ListForm.Unordered
		}
		else {
			const { form, index } = extractNumericValueFromMatch(match, 4)
			definition.form = form
			definition.index = index
		}

		if (match[8]) {
			definition.todoState = checkboxGlyphToTodoState(match[8])
			definition.glyph += match[8]
		}

		return definition as ListDefinition
	}

	return null
}

const A_index = 65
const Z_index = 90
const a_index = 97
const z_index = 122

function extractNumericValueFromMatch(match: RegExpMatchArray, offset = 0): Partial<ListDefinition> {
	let form = 0
	let index = 0

	if (match[1 + offset]) {
		form = ListForm.Digit
		index = parseInt(match[1 + offset])
	}
	else if (match[2 + offset]) {
		form = ListForm.AlphaLower
		// 'a' is index 97
		index = match[2 + offset].charCodeAt(0) - a_index + 1
	}
	else if (match[3 + offset]) {
		form = ListForm.AlphaUpper
		// 'A' is index 65
		index = match[3 + offset].charCodeAt(0) - A_index + 1
	}
	
	return { form, index }
}

export function getFormOfGlyph(glyph: string): Partial<ListDefinition> {
	const match = glyph.match(numericGlyphMatcher)

	if (match) {
		return extractNumericValueFromMatch(match)
	}

	return undefined
}

export function getGlyphForNumber(form: ListForm, index: number = 1) {
	switch (form) {
		case ListForm.Unordered:
			return undefined
		case ListForm.AlphaUpper:
			if (index > 0 && index < Z_index - A_index) {
				return String.fromCharCode(A_index - 1 + index) + '.'
			}
			break
		case ListForm.AlphaLower:
			if (index > 0 && index < z_index - a_index) {
				return String.fromCharCode(a_index - 1 + index) + '.'
			}
			break
	}
	return index.toString() + '.'
}

export function parseListItem(char: string, parser: NoteParser): boolean {
	if (!parser.isStartOfContent) return false
	const line = parser.feed.getLineText()
	const listDetail = matchList(line)
	if (!listDetail) return false
	
	const { feed } = parser
	const start = feed.index
	if (listDetail.todoState === undefined) {
		// IMPROVE: A dirty hack to make the delta format compose
		listDetail.todoState = null
	}
	else {
		parser.pushStructure({
			type: StructureType.Todo,
			start,
			end: start + line.length,
			state: listDetail.todoState,
			text: line.substring(ListDefinition.length(listDetail))
		})
	}

	// Encode the list
	parser.lineData.list = listDetail

	// Consume the line glyph
	feed.nextByLength(listDetail.glyph.length - 1)
	parser.commitSpan({
		line_format: 'list',
		hiddenGroup: true,
		list_format: listDetail
	})

	return true
}
