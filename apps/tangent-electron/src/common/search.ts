import { escapeRegExp, getRegexMatchIndices, last } from '@such-n-such/core'
import { daysIntoYear } from './dates'
import type { TreeNode } from './trees'
import { IndexData } from './indexing/indexTypes'
import paths, { normalizeSeperators } from './paths'
import { applyAnnotation, ChildList } from './annotations/nodeAnnotations'

export type PathMatch = RegExp
export type SearchMatchResult = RegExpMatchArray

export interface SegmentSearchNodePair {
	node: TreeNode
	match: SearchMatchResult
}

const SLASHES = '\\/\\\\'
const ANY_SLASH = `[${SLASHES}]`
const NO_SLASH = `[^${SLASHES}]`

export function buildFuzzySegementMatcher(segment: string) {
	return new RegExp(fuzzySegmentMatcherString(segment), 'id')
}

export function fuzzySegmentMatcherString(segment: string) {
	const tokens = segment.split(/\s+/)
	let matchString = ''

	for (let index = 0; index < tokens.length; index++) {
		// Escape all regex characters for now
		matchString += '(' + escapeRegExp(tokens[index]) + ')'

		if (index < tokens.length - 1) {
			// Allow mid token to select everything
			matchString +=  '.*'
		}
	}
	return matchString
}

interface BuildMatcherOptions {
	fuzzy?: boolean
	caseSensitive?: boolean
}

export function buildMatcher(pathString: string, options?: BuildMatcherOptions): PathMatch {
	if (pathString == null) return undefined
	let segments = paths.segment(pathString)

	let matchString = ''

	if (options?.fuzzy) {
		matchString = segments.map(s => {
			if (s === '') return `${NO_SLASH}*`
			return fuzzySegmentMatcherString(s)
		}).join(`${NO_SLASH}*${ANY_SLASH}${NO_SLASH}*`)
	}
	else {
		matchString = `(?:${ANY_SLASH}|^)` + segments.map(s => {
			return `(${escapeRegExp(s)})`
		}).join(`${ANY_SLASH}`) + `(?:${ANY_SLASH}|\\.\\w+$)?$`
	}
	
	let flags = 'd'
	if (!options?.caseSensitive) flags += 'i'

	return new RegExp(matchString, flags)
}

export function* nodeSearchResults(node: TreeNode, searchMatch: RegExp, root?: TreeNode): Generator<SearchMatchResult> {
	for (const path of IndexData.pathAndAliasPaths(node)) {
		if (root) {
			const childPath = paths.getChildPath(root.path, path)
			if (childPath) {
				yield normalizeSeperators(childPath, '/').match(searchMatch)
			}
			else {
				console.error('Search could not find child path for', root, node)
			}
		}
		else {
			yield normalizeSeperators(path, '/').match(searchMatch)
		}
	}
}

export function compareNodeSearch(a: SearchMatchResult, b: SearchMatchResult) {
	if (!a && !b) return 0
	if (!a) return 1
	if (!b) return -1

	// Find the local directory start here
	const aDirStart = a.input.lastIndexOf('/', a.index)
	const bDirStart = b.input.lastIndexOf('/', b.index)

	const aRelSart = a.index - aDirStart
	const bRelStart = b.index - bDirStart

	// A start index earlier in the string is better
	if (aRelSart < bRelStart) return -1
	if (aRelSart > bRelStart) return 1

	// Compare group matches earlier / longer groups win
	const aIndices = getRegexMatchIndices(a)
	const bIndices = getRegexMatchIndices(b)
	const maxIndex = Math.min(aIndices.length, bIndices.length)
	
	let aTotal = 0
	let bTotal = 0

	for (let index = 1; index < maxIndex; index++) {
		const [aStart, aEnd] = aIndices[index]
		const [bStart, bEnd] = bIndices[index]

		const startDiff = (aStart - aDirStart) - (bStart - bDirStart)
		if (startDiff !== 0) {
			// Earlier starts are better
			return startDiff
		}

		const endDiff = (bEnd - bDirStart) - (aEnd - aDirStart)
		if (endDiff !== 0) {
			// Later ends are better if starts are equal
			return endDiff
		}

		//aTotal += aEnd - aStart
		//bTotal += bEnd - bStart
	}

	// Since earlier matches are equal, more matches are better
	if (aIndices.length > maxIndex) return -1
	if (bIndices.length > maxIndex) return 1
	
	// Whatever match hits more of the source wins
	// e.g `|hello|` is better than `|hello| my fellow kids`
	const aRatio = a[0].length / (a.input.length - aDirStart)
	const bRatio = b[0].length / (b.input.length - bDirStart)
	return bRatio - aRatio
}

export function bestMatchForSearch(node: TreeNode, searchMatch: RegExp, root?: TreeNode): SearchMatchResult {
	let bestMatch: SearchMatchResult = null

	for (const match of nodeSearchResults(node, searchMatch, root)) {
		const comparison = compareNodeSearch(bestMatch, match)
		if (comparison > 0) {
			bestMatch = match
		}
	}

	return bestMatch
}

export function orderTreeNodesForSearch(a: SegmentSearchNodePair, b: SegmentSearchNodePair) {
	if (a.match && b.match) {
		const result = compareNodeSearch(a.match, b.match)
		// Fractional differences occur only when we've fallen back to ratios
		// We want to use different metrics for similar ratios
		// This value is a hand-tuned guess
		if (Math.abs(result) > .15) return result

		// Use lower precision here so that we can sort by edit date
		// for notes with similar inlink count, losing precision as values increase
		const aInlinkish = Math.log2(a.node.meta?.inLinks?.length ?? 0)
		const bInlinkish = Math.log2(b.node.meta?.inLinks?.length ?? 0)

		const inlinkishDiff = bInlinkish - aInlinkish
		if (Math.abs(inlinkishDiff) > .5) {
			return inlinkishDiff
		}
	}
	
	const timeA = a.node.modified
	const timeB = b.node.modified

	if (timeA && timeB) {
		const yearA = timeA.getFullYear()
		const yearB = timeB.getFullYear()

		if (yearA !== yearB) {
			return yearB - yearA
		}

		const dayA = daysIntoYear(timeA)
		const dayB = daysIntoYear(timeB)

		if (dayA !== dayB) {
			return dayB - dayA
		}
	}
	else if (timeA) {
		return -1
	}
	else if (timeB) {
		return 1
	}

	if (a.node.name < b.node.name) {
		return -1
	}
	if (a.node.name > b.node.name) {
		return 1
	}
	return 0
}

export function annotateMatchText(match: RegExpMatchArray, source?: string | ChildList, start = 0, end = undefined, highlightClass = 'match-highlight'): ChildList {
	source = source ?? match.input.substring(start, end)
	if (typeof source === 'string') {
		source = [source]
	}

	// Present when using the 'd' regex flag for group indices
	const indices = (match as any).indices as ([number, number])[]
	if (!indices) throw new Error("In order to annotate match text, matches must be compiled with the `d` flag.")

	for (let groupIndex = 1; groupIndex < match.length; groupIndex++) {
		const groupStart = indices[groupIndex][0] - start
		const groupEnd = indices[groupIndex][1] - start

		const effectiveStart = Math.max(start, groupStart)
		const effectiveEnd = end ? Math.min(end, groupEnd) : groupEnd

		if (effectiveStart === effectiveEnd) continue

		source = applyAnnotation(source, {
			className: highlightClass
		}, [effectiveStart, effectiveEnd])
	}

	return source
}
