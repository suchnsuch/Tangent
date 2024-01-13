import type { TextDocument, Line, EditorRange } from '@typewriter/document'

const idealLinePriority = 2

function getLinePriority(line: Line) {
	const attr = line.attributes

	if (attr.front_matter) return -10
	if (line.length === 1) return 0
	if (attr.header) return 1

	return idealLinePriority
}

export function getInitialSelection(doc: TextDocument): EditorRange {
	if (doc.lines.length) {
		let bestLine = doc.lines[0]
		let bestLinePriority = getLinePriority(bestLine)
		for (let i = 1; i < doc.lines.length && bestLinePriority < idealLinePriority; i++) {
			const line = doc.lines[i]
			let linePriority = getLinePriority(line)
			if (linePriority > bestLinePriority) {
				bestLine = line
				bestLinePriority = linePriority
			}
		}
		
		const [start, end] = doc.getLineRange(bestLine)
		return [end - 1, end - 1]
	}
	return undefined
}
