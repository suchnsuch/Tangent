import { mapIterator } from '@such-n-such/core'
import type { PartialClauseValue } from '@such-n-such/tangent-query-parser'
import type { Annotation } from 'common/nodeReferences'

export function getTextAnnotations(text: string, partial: PartialClauseValue): Annotation[] {
	if ('text' in partial) {
		let startIndex = 0
		let annotations: Annotation[] = []
		while (startIndex < text.length) {
			const index = text.indexOf(partial.text, startIndex)
			if (index >= 0) {
				annotations.push({
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
							data: { ...partial, group: groupIndex },
							start,
							end
						})
					}
				}

				return result
			}
			return [{
				data: partial,
				start: match.index,
				end: match.index + match[0].length
			}]
		}

		if (regex.global) {
			const matches = text.matchAll(regex)
			if (matches) {
				const result = []
				for (const match of matches) {
					result.push(...matchToAnnotations(match))
				}
				return result
			}
		}
		else {
			const match = text.match(regex)
			if (match) {
				return matchToAnnotations(match)
			}
		}
	}
	return null
}
