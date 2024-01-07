import { TextDocument, Line, Delta, Op, AttributeMap, EditorRange, normalizeRange } from '@typewriter/document'
import { findWordAround } from '../stringUtils'

export function rangeContainsRange(container: EditorRange, contained: EditorRange) {
	if (!container || !contained) return false
	container = normalizeRange(container)
	contained = normalizeRange(contained)
	return container[0] <= contained[0] && container[1] >= contained[1]
}

export function rangeContains(range: EditorRange, value: number) {
	if (!range) return false
	range = normalizeRange(range)
	return range[0] <= value && value <= range[1]
}

export function rangeIsCollapsed(range: EditorRange) {
	if (!range) return false
	return range[0] === range[1]
}

/**
 * Returns the intersection of two normalized ranges
 */
export function intersectRanges(rangeA: EditorRange, rangeB: EditorRange): EditorRange {
	return [Math.max(rangeA[0], rangeB[0]), Math.min(rangeA[1], rangeB[1])]
}

export function typewriterToText(model: TextDocument | Line[], startLine?: number, endLine?: number): string {

	let strings: string[] = null

	const lines = Array.isArray(model) ? model : model.lines

	if (startLine !== undefined || endLine !== undefined) {
		strings = lines.slice(startLine, endLine + 1).map(lineToText)
	}
	else {
		strings = lines.map(lineToText)
	}
	
	return strings.join('\n')
}

export function lineToText(line: Line) {
	return line.content.ops.map(op => op.insert).join('')
}

/**
 * Lines are equivalent if they have the same Op insert values
 * Ignores all attributes
 */
export function areLineArraysOpTextEquivalent(a: Line[], b: Line[]) {
	if (a === b) return true
	if (!a || !b) return false
	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (!areLinesOpTextEquivalent(a[i], b[i])) {
			return false
		}
	}
	return true
}

/**
 * Lines are equivalent if they have the same Op insert values
 * Ignores all attributes
 */
export function areLinesOpTextEquivalent(a: Line, b: Line) {
	if (a === b) return true
	if (a.length !== b.length) return false

	const aOps = a.content.ops
	const bOps = b.content.ops

	if (aOps === bOps) return true
	if (aOps.length !== bOps.length) return false

	for (let index = 0; index < aOps.length; index++) {
		if (aOps[index].insert !== bOps[index].insert) {
			return false
		}
	}
	return true
}

export function findWordAroundPositionInDocument(doc: TextDocument, position: number): EditorRange {
	const line = doc.getLineAt(position)
	const [start, end] = doc.getLineRange(line)
	const lineText = lineToText(line)

	const [wordStart, wordEnd] = findWordAround(lineText, position - start)
	return [start + wordStart, start + wordEnd]
}

export function getOpDetailsForTextPosition(delta: Delta, position: number): {
	op: Op
	index: number
	range: EditorRange
} {
	let start = 0
	for (let i = 0; i < delta.ops.length; i++) {
		const end = start + Op.length(delta.ops[i])
		if (end > position) {
			return {
				op: delta.ops[i],
				index: i,
				range: [start, end]
			}
		}
		start = end
	}
	return null
}

export function getEditInfo(delta: Delta): {
	offset: number
	insert?: string
	shift: number // positive for insert, negative for delete
} {
	/**
	 * This function is looking for a completely clean Delta, e.g.
	 * ops: [
	 * 		{ retain: 2 }, // Optional
	 * 		{ insert: 'something' OR delete: <number> }, // Required
	 * 		{ retain: 5 } // Optional
	 * ]
	 * 
	 * Deviating from this form means no go
	 */
	if (!delta?.ops.length) return null

	let offset = 0
	let insert: string = null
	let deleteCount: number = null
	let index = 0

	for (; index < delta.ops.length; index++) {
		let op = delta.ops[index]
		if ('retain' in op) {
			if (insert || deleteCount) {
				// Retains after a single insert/delete are okay
				continue
			}
			else {
				offset += op.retain
			}
		}
		else if ('insert' in op) {
			if (typeof op.insert === 'string') {
				if (insert === null) {
					insert = op.insert
				}
				else return null // Double insert not supported
			}
			break
		}
		else if ('delete' in op) {
			if (typeof op.delete === 'number') {
				if (deleteCount === null) {
					deleteCount = op.delete
				}
				else return null // Double delete not supported
			}
			break
		}
		else {
			// Not allowed
			return null
		}
	}

	if (insert) {
		return { offset, insert, shift: insert.length }
	}
	if (deleteCount) {
		return { offset, shift: -deleteCount }
	}
	return null
}

export type AttributePredicate = (attributes: AttributeMap) => boolean
export function getRangeWhile(
	doc: TextDocument,
	startingRange: number | EditorRange,
	predicate: AttributePredicate,
	initalCheck: 'start' | 'end' = 'start'
): EditorRange {
	let [start, end] = typeof startingRange === 'number' ? [startingRange, startingRange] : startingRange

	// TODO: parse through the lines directly
	const delta = doc.toDelta()

	const startDetails = getOpDetailsForTextPosition(delta, initalCheck === 'start' ? start : end)
	if (!startDetails || !predicate(startDetails.op.attributes)) {
		return null
	}

	let index = startDetails.index
	start = startDetails.range[0]
	end = startDetails.range[1]

	let walkingOp = startDetails.op

	let moveNext = (step: number) => {
		index += step
		if (index < 0 || index >= delta.ops.length) {
			return false
		}
		walkingOp = delta.ops[index]
		return predicate(walkingOp.attributes)
	}

	// Move back 
	while (moveNext(-1)) {
		start -= Op.length(walkingOp)
	}

	// Reset
	index = startDetails.index
	
	// Move forward
	while(moveNext(1)) {
		end += Op.length(walkingOp)
	}
	
	return [start, end]
}

export function getLineRangeWhile(
	doc: TextDocument,
	startingRange: number | EditorRange,
	predicate: AttributePredicate
): EditorRange {
	let [start, end] = typeof startingRange === 'number' ? [startingRange, startingRange] : startingRange

	const firstLine = doc.getLineAt(start)
	if (!predicate(firstLine.attributes)) return null

	let firstLineIndex = doc.lines.indexOf(firstLine)
	let lastLineIndex = firstLineIndex

	// Walk back
	let walkingLineIndex = firstLineIndex - 1
	while (walkingLineIndex >= 0 && predicate(doc.lines[walkingLineIndex].attributes)) {
		walkingLineIndex--
	}

	firstLineIndex = walkingLineIndex + 1 // step forward again as the last line was bad

	// Walk forward
	walkingLineIndex = lastLineIndex + 1
	while (walkingLineIndex < doc.lines.length && predicate(doc.lines[walkingLineIndex].attributes)) {
		walkingLineIndex++
	}

	lastLineIndex = walkingLineIndex - 1 // step back again as the last line was bad

	start = doc.getLineRange(doc.lines[firstLineIndex])[0]
	end = doc.getLineRange(doc.lines[lastLineIndex])[1]

	return [start, end]
}
