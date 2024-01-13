import { last } from '@such-n-such/core'
import { tagNameSeperatorMatch, tokenizeTagName } from '@such-n-such/tangent-query-parser'

/**
 * Group 1: The name of the tag
 * Group 2: Any parameters, including the parentheses
 * Group 3: Any parameters, not including the parentheses
 */
export const tagMatcher = /(?:^|\s)#([^\s#,?!@#$%^&*\(\)\[\]\{\}\|\\<>;:'"]+)(\(([^)]*)\))?/

export interface TagDefinition {
	names: string[]
	start: number
	length: number

	// TODO: Actually parse properties
}

export interface TagSectionData {
	name: string
	depth: number
	totalDepth: number
}

export function matchTag(line: string): TagDefinition {
	const match = line.match(tagMatcher)
	if (!match) return null

	let start = match.index
	let length = match[0].length

	if (match[0][0] !== '#') {
		// Don't actually include the leading space
		start++
		length--
	}

	let names = tokenizeTagName(match[1])
	while (last(names) === '') {
		// Drop the trailing seperator
		names.pop()
		length--
	}

	return {
		names,
		start,
		length
	}
}
