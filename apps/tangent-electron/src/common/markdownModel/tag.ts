import { last } from '@such-n-such/core'
import { tagNameSeperatorMatch, tokenizeTagName } from '@such-n-such/tangent-query-parser'
import NoteParser from './NoteParser'
import { StructureType, TagInfo } from '../indexing/indexTypes'

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

export function parseTag(char: string, parser: NoteParser): boolean {
	if (char !== '#') return false
	const { feed, builder } = parser

	// Ignore hashes next to whitespace
	if (!feed.peek().trim()) return false

	// Tags should not start next to text
	if (feed.peek(-1).trim()) return false

	const line = feed.getLineText()
	const tagDefinition = matchTag(line)
	if (!tagDefinition) return false

	parser.commitSpan(null, 0)

	const start = feed.index

	builder.addOpenFormat('tag', {
		tag: tagDefinition.names,
		hiddenGroup: true
	})

	// Commit the #
	parser.commitSpan({
		tag_internal: true,
		hidden: true
	})

	// Commit the sections
	let cumulativeName = ''
	for (let i = 0; i < tagDefinition.names.length; i++) {
		const name = tagDefinition.names[i]
		feed.nextByLength(name.length)
		cumulativeName += name
		parser.commitSpan({
			tag_section: {
				name: cumulativeName,
				depth: i + 1,
				totalDepth: tagDefinition.names.length
			} as TagSectionData
		})

		if (i < tagDefinition.names.length - 1) {
			// Consume the seperator
			feed.next()
			parser.commitSpan({
				tag_seperator: {
					prev: cumulativeName,
					next: cumulativeName + '--' + tagDefinition.names[i + 1],
					depth: i + 1
				}
			})

			cumulativeName += '--'
		}
	}

	if (feed.peek()?.match(tagNameSeperatorMatch)) {
		// Grab the seperator, but not as a section
		feed.next()
		parser.commitSpan({
			tag_internal: true,
			hiddenGroup: true
		})
	}

	const tagInfo: TagInfo = {
		type: StructureType.Tag,
		form: 'tag',
		start,
		end: start + tagDefinition.length,
		href: tagDefinition.names.join('/')
	}

	if (parser.detailedLinks) {
		tagInfo.context = feed.getLineText(parser.lineStart)
	}

	parser.pushStructure(tagInfo)

	builder.dropOpenFormat('tag')
	return true
}
