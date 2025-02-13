import { ConnectionInfo, HeaderInfo, StructureData, StructureType, TagInfo, TodoInfo } from './indexTypes'

/**
 * Returns if the two pieces of structure are the same, even if any position data is different
 */
export function structureSoftEquals(a: StructureData, b: StructureData): boolean {
	if (a.type !== b.type) return false

	switch (a.type) {
		case StructureType.Link:
		case StructureType.Embed:
		case StructureType.Tag:
			b = b as (ConnectionInfo)
			return a.href === b.href && a.to === b.to && a.text === b.text && a.content_id === b.content_id
		case StructureType.Header:
			b = b as (HeaderInfo)
			return a.level === b.level && a.text === b.text
		case StructureType.FrontMatter:
			return false // TODO: This is _so_ not accurate :P
		case StructureType.Todo:
			b = b as (TodoInfo)
			return a.state === b.state && a.text === b.text
		default:
			throw new Error(`structureSoftEquals not implemented for ${(a as any).type}`)
	}
}

export interface StructureDelta {
	removed: StructureData[]
	added: StructureData[]
}

export function diffStructure(prev: StructureData[], next: StructureData[]): StructureDelta {
	prev = prev ?? []
	next = next ?? []
	let prevIndex = 0
	let nextIndex = 0

	const removed: StructureData[] = []
	const added: StructureData[] = []

	while (prevIndex < prev.length && nextIndex < next.length) {
		const prevItem = prev[prevIndex]
		const nextItem = next[nextIndex]
		if (!structureSoftEquals(prevItem, nextItem)) {
			if (prevItem.end < nextItem.end) {
				removed.push(prevItem)
				prevIndex++
			}
			else {
				added.push(nextItem)
				nextIndex++
			}
		}
		else {
			prevIndex++
			nextIndex++
		}
	}

	while (prevIndex < prev.length) {
		removed.push(prev[prevIndex])
		prevIndex++
	}

	while (nextIndex < next.length) {
		added.push(next[nextIndex])
		nextIndex++
	}

	return { removed, added }
}
