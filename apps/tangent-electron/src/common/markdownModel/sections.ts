import { EditorRange, Line, normalizeRange, TextDocument } from '@typewriter/document'
import { lineToText } from 'common/typewriterUtils'

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
