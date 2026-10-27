import type { PartialClauseValue } from '@such-n-such/tangent-query-parser'
import type { Annotation, Range } from 'common/nodeReferences'

const fullRange = {
	start: 0,
	end: -1
}

export function getTextAnnotations(
	text: string,
	partial: PartialClauseValue,
	range: Range = fullRange,
	target?: Annotation['target']
) : Annotation[]
{
	if ('text' in partial) {
		let startIndex = range.start
		let annotations: Annotation[] = []
		while (startIndex < text.length) {
			const index = text.indexOf(partial.text, startIndex)
			if (index >= 0 && (range.end === -1 || range.end >= index + partial.text.length)) {
				annotations.push({
					target,
					data: partial,
					start: index,
					end: index + partial.text.length
				})
				startIndex = index + partial.text.length
			}
			else break
		}
		return annotations
	}
	else if ('regex' in partial) {
		const regex = partial.regex
		function matchToAnnotations(match: RegExpMatchArray) {
			if (match.length > 1) {

				const result: Annotation[] = []

				for (let groupIndex = 0; groupIndex < match.length; groupIndex++) {
					// A hack to pull out indicies indicated by the 'd' value
					const indices = (match as any).indices[groupIndex]
					if (!indices) throw new Error(`No indicies found for group "${groupIndex}" in regex "${regex}". Was 'd' flag not present?`)
					const start = indices[0]
					const end = indices[1]

					const last = result.at(-1)
					if (!last || (last.start !== start || last.end !== end)) {
						result.push({
							target,
							data: { ...partial, group: groupIndex },
							start: start + range.start,
							end: end + range.start
						})
					}
				}

				return result
			}
			return [{
				target,
				data: partial,
				start: match.index,
				end: match.index + match[0].length
			}]
		}

		const clippedText = text.substring(
			range.start,
			range.end < 0 ? undefined : range.end
		)

		if (regex.global) {
			const matches = clippedText.matchAll(regex)
			if (matches) {
				const result = []
				for (const match of matches) {
					result.push(...matchToAnnotations(match))
				}
				return result
			}
		}
		else {
			const match = clippedText.match(regex)
			if (match) {
				return matchToAnnotations(match)
			}
		}
	}
	return null
}
