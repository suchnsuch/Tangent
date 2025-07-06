import { EditorRange, Line, normalizeRange, TextChange, TextDocument } from '@typewriter/document'
import { lineToText } from 'common/typewriterUtils'
import { lineIsMultiLineFormat } from './line'

/**
 * 
 * @param lineA The first line
 * @param lineB The second line
 * @returns 0 if the lines have equivalent depth. < 0 if A is higher. > 0 if B is higher.
 * 			`true` if the lines should be considered the same unit.
 */
export function compareSectionDepth(lineA: Line, lineB: Line): number | true {
	const attrA = lineA.attributes
	const attrB = lineB.attributes

	// Something that's more indented is inherently a lower section
	const indentA = attrA?.indent?.indentSize ?? 0
	const indentB = attrB?.indent?.indentSize ?? 0
	if (indentA !== indentB) {
		return indentA - indentB
	}
	
	// Headers beat out everything
	const headerA = attrA?.header
	const headerB = attrB?.header
	if (headerA && headerB) {
		return headerA - headerB
	}
	if (headerA) return -1
	if (headerB) return 1

	// Horizontal rules beat all but headers
	const hrA = attrA?.horizontal_rule
	const hrB = attrB?.horizontal_rule
	if (hrA && hrB) return 0
	if (hrA) return -1
	if (hrB) return 1

	// Lists are the bottom of the totem pole
	const listA = attrA?.list
	const listB = attrB?.list
	if (listA && listB) {
		// All list types on the same indent are equivalent
		return 0
	}
	if (listA) return 1
	if (listB) return -1

	// Quotes!
	const quoteA = attrA?.blockquote
	const quoteB = attrB?.blockquote
	if (quoteA && quoteB) {
		if (quoteA === quoteB) return true
		return quoteA - quoteB
	}

	// Code needs to be considered together
	const codeA = attrA?.code
	const codeB = attrB?.code
	if (codeA && codeB) {
		// If its the same, they're the same
		if (codeA === codeB) return true
		// Otherwise just equivalent
		return 0
	}

	// Math needs to be considered together
	const mathA = attrA?.math
	const mathB = attrB?.math
	if (mathA && mathB) {
		if (mathA === mathB) return true
		return 0
	}

	// Frontmatter needs to be considered together
	const frontA = attrA?.front_matter
	const frontB = attrB?.front_matter
	if (frontA && frontB) {
		if (frontA === frontB) return true
		return 0
	}

	return 0
}

export function findHighestLine(lines: Line[]): Line {
	let highest = lines[0]
	for (let i = 1; i < lines.length; i++) {
		const comparison = compareSectionDepth(highest, lines[i])
		if (typeof comparison === 'number' && comparison > 0) {
			highest = lines[i]
		}
	}
	return highest
}

export function findSectionLines(
	doc: TextDocument,
	selection?: EditorRange | Line[],
	expandUp: boolean | 'take-parent' = true,
	expandDown = true
) {
	selection = selection ?? doc.selection
	if (!selection || selection.length === 0) return null

	const lines = typeof selection[0] === 'number'
		? doc.getLinesAt(normalizeRange(selection as EditorRange))
		: selection as Line[]

	let highest = findHighestLine(lines)

	if (expandUp) {
		let trailingIndex = doc.lines.indexOf(lines[0]) - 1
		while (trailingIndex >= 0) {
			const line = doc.lines[trailingIndex]
			const comparison = compareSectionDepth(highest, line)

			if (comparison === true	// Take same section
				// Take lower or equal sections if the first part of the starting lines is an incomplete section
				|| (comparison <= 0 && doc.lines[trailingIndex + 1] !== highest) 
			) {
				// Shift to include this earlier line
				lines.unshift(line)

				// Let this be the highest
				if (comparison === true || comparison === 0) {
					highest = line
				}
				
				trailingIndex--
			}
			else if (expandUp === 'take-parent' && comparison > 0) {
				// Special case: if we're moving up and the next item is higher, inherit that section
				// e.g. shifting a paragraph up into a header moves the _whole header section_
				highest = line
				lines.unshift(highest)
				break
			}
			else break
		}
	}
	
	if (expandDown) {
		let leadingIndex = doc.lines.indexOf(lines.at(-1)) + 1
		while (leadingIndex < doc.lines.length) {
			const comparison = compareSectionDepth(highest, doc.lines[leadingIndex])
			if (comparison === true || comparison < 0) {
				lines.push(doc.lines[leadingIndex])
				leadingIndex++
			}
			else break
		}
	}
	
	return {
		lines,
		highest
	}
}

export function isLineCollapsible(lines: Line[], lineIndex: number) {
	if (lineIndex < 0 || lineIndex >= lines.length - 1) return false

	const line = lines[lineIndex]

	if (lineIsMultiLineFormat(line)) {
		if (lineIndex === 0) return true
		const comparison = compareSectionDepth(line, lines[lineIndex - 1])
		if (comparison !== true) return true
	}
	else if (line.attributes.horizontal_rule) return false
	else {
		let nextLine = lineIndex + 1
		while (nextLine < lines.length) {
			const comparison = compareSectionDepth(line, lines[lineIndex + 1])
			if (comparison !== true) {
				return comparison < 0
			}
			nextLine++
		}
	}
	return false
}

/*
 * Hack documentation.
 * The "collapsed" attribute should be as condensed as possible.
 * A positive value means the line has been collapsed by some number of parents.
 * A _negative_ value means that the line has collapsed its children.
 * 	-1 -> A visible line that has collapsed its children.
 * 	-2>= -> A collapsed line that has collapsed its children.
 */

export function isCollapsed(collapsedState: any): boolean {
	return typeof collapsedState === 'number' && !(collapsedState === 0 || collapsedState === -1)
}

export function hasCollapsedChildren(collapsedState: any): boolean {
	return typeof collapsedState === 'number' && collapsedState < 0
}

export function isLineCollapsed(line: Line): boolean {
	return isCollapsed(line.attributes.collapsed)
}

export function lineHasCollapsedChildren(line: Line): boolean {
	return hasCollapsedChildren(line.attributes.collapsed)
}

export type CollapseChange = {
	[K: string]: number
}

function getCollapseState(line: Line, change: CollapseChange): number | undefined {
	if (change[line.id] !== undefined) return change[line.id]
	return line.attributes.collapsed
}

function modifyCollapseState(line: Line, change: CollapseChange, modification: number) {
	const state = getCollapseState(line, change) ?? 0
	change[line.id] = state < 0 ? Math.min(state - modification, 0) : Math.max(state + modification, 0)
}

export function getFirstCollapseableParentIndex(doc: TextDocument, position: number): number {
	const sourceLine = doc.getLineAt(position)
	const sourceLineIndex = doc.lines.indexOf(sourceLine)

	for (let i = sourceLineIndex; i >= 0; i--) {
		if (i !== sourceLineIndex) {
			const compare = compareSectionDepth(sourceLine, doc.lines[i])
			if (compare !== true && compare <= 0) continue
		}
		if (isLineCollapsible(doc.lines, i)) return i
	}

	return undefined
}

export function collapseSection(doc: TextDocument, line: Line, change: CollapseChange = {}): CollapseChange {
	const startLineState = getCollapseState(line, change)
	if (startLineState === undefined || startLineState === null || startLineState === 0) {
		// The line has collapsed its children but is still visible
		change[line.id] = -1
	}
	else if (startLineState > 0) {
		// The line was previously collapsed by a parent and now it collapses its children as well
		change[line.id] = -(startLineState + 1)
	}
	else {
		modifyCollapseState(line, change, 1)
	}

	const startLineIndex = doc.lines.indexOf(line)

	for (let index = startLineIndex + 1; index < doc.lines.length; index++) {
		const someLine = doc.lines[index]
		const comparison = compareSectionDepth(line, someLine)
		if (comparison === true || comparison < 0) {
			modifyCollapseState(someLine, change, 1)
		}
		else {
			break
		}
	}

	return change
}

export function expandSection(doc: TextDocument, line: Line, change: CollapseChange = {}): CollapseChange {
	const startLineState = getCollapseState(line, change)
	if (startLineState === undefined || startLineState === null || startLineState >= 0) {
		// Do nothing. This is unexpected
		return
	}
	else if (startLineState < 0) {
		// The line previously collapsed its children, now it doesn't
		change[line.id] = -(startLineState + 1)
	}

	const startLineIndex = doc.lines.indexOf(line)

	for (let index = startLineIndex + 1; index < doc.lines.length; index++) {
		const someLine = doc.lines[index]
		const comparison = compareSectionDepth(line, someLine)
		if (comparison === true || comparison < 0) {
			modifyCollapseState(someLine, change, -1)
		}
		else {
			break
		}
	}

	return change
}

export function applyCollapseChange(collapse: CollapseChange, text: TextChange): TextChange {
	for (const key of Object.keys(collapse)) {
		const range = text.doc.getLineRange(key)
		text.formatLine(range[0], { collapsed: collapse[key] }, true)
	}
	return text
}
