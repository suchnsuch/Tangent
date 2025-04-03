import { Line } from '@typewriter/document'

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
