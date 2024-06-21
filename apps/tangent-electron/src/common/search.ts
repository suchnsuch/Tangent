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

// Check out this madness: https://stackoverflow.com/questions/227950/programatic-accent-reduction-in-javascript-aka-text-normalization-or-unaccentin
// Provides character classes for all accents per latin character.
const ACCENTS = {
	'A': '[Aa\xaa\xc0-\xc5\xe0-\xe5\u0100-\u0105\u01cd\u01ce\u0200-\u0203\u0226\u0227\u1d2c\u1d43\u1e00\u1e01\u1e9a\u1ea0-\u1ea3\u2090\u2100\u2101\u213b\u249c\u24b6\u24d0\u3371-\u3374\u3380-\u3384\u3388\u3389\u33a9-\u33af\u33c2\u33ca\u33df\u33ff\uff21\uff41]',
	'B': '[Bb\u1d2e\u1d47\u1e02-\u1e07\u212c\u249d\u24b7\u24d1\u3374\u3385-\u3387\u33c3\u33c8\u33d4\u33dd\uff22\uff42]',
	'C': '[Cc\xc7\xe7\u0106-\u010d\u1d9c\u2100\u2102\u2103\u2105\u2106\u212d\u216d\u217d\u249e\u24b8\u24d2\u3376\u3388\u3389\u339d\u33a0\u33a4\u33c4-\u33c7\uff23\uff43]',
	'D': '[Dd\u010e\u010f\u01c4-\u01c6\u01f1-\u01f3\u1d30\u1d48\u1e0a-\u1e13\u2145\u2146\u216e\u217e\u249f\u24b9\u24d3\u32cf\u3372\u3377-\u3379\u3397\u33ad-\u33af\u33c5\u33c8\uff24\uff44]',
	'E': '[Ee\xc8-\xcb\xe8-\xeb\u0112-\u011b\u0204-\u0207\u0228\u0229\u1d31\u1d49\u1e18-\u1e1b\u1eb8-\u1ebd\u2091\u2121\u212f\u2130\u2147\u24a0\u24ba\u24d4\u3250\u32cd\u32ce\uff25\uff45]',
	'F': '[Ff\u1da0\u1e1e\u1e1f\u2109\u2131\u213b\u24a1\u24bb\u24d5\u338a-\u338c\u3399\ufb00-\ufb04\uff26\uff46]',
	'G': '[Gg\u011c-\u0123\u01e6\u01e7\u01f4\u01f5\u1d33\u1d4d\u1e20\u1e21\u210a\u24a2\u24bc\u24d6\u32cc\u32cd\u3387\u338d-\u338f\u3393\u33ac\u33c6\u33c9\u33d2\u33ff\uff27\uff47]',
	'H': '[Hh\u0124\u0125\u021e\u021f\u02b0\u1d34\u1e22-\u1e2b\u1e96\u210b-\u210e\u24a3\u24bd\u24d7\u32cc\u3371\u3390-\u3394\u33ca\u33cb\u33d7\uff28\uff48]',
	'I': '[Ii\xcc-\xcf\xec-\xef\u0128-\u0130\u0132\u0133\u01cf\u01d0\u0208-\u020b\u1d35\u1d62\u1e2c\u1e2d\u1ec8-\u1ecb\u2071\u2110\u2111\u2139\u2148\u2160-\u2163\u2165-\u2168\u216a\u216b\u2170-\u2173\u2175-\u2178\u217a\u217b\u24a4\u24be\u24d8\u337a\u33cc\u33d5\ufb01\ufb03\uff29\uff49]',
	'J': '[Jj\u0132-\u0135\u01c7-\u01cc\u01f0\u02b2\u1d36\u2149\u24a5\u24bf\u24d9\u2c7c\uff2a\uff4a]',
	'K': '[Kk\u0136\u0137\u01e8\u01e9\u1d37\u1d4f\u1e30-\u1e35\u212a\u24a6\u24c0\u24da\u3384\u3385\u3389\u338f\u3391\u3398\u339e\u33a2\u33a6\u33aa\u33b8\u33be\u33c0\u33c6\u33cd-\u33cf\uff2b\uff4b]',
	'L': '[Ll\u0139-\u0140\u01c7-\u01c9\u02e1\u1d38\u1e36\u1e37\u1e3a-\u1e3d\u2112\u2113\u2121\u216c\u217c\u24a7\u24c1\u24db\u32cf\u3388\u3389\u33d0-\u33d3\u33d5\u33d6\u33ff\ufb02\ufb04\uff2c\uff4c]',
	'M': '[Mm\u1d39\u1d50\u1e3e-\u1e43\u2120\u2122\u2133\u216f\u217f\u24a8\u24c2\u24dc\u3377-\u3379\u3383\u3386\u338e\u3392\u3396\u3399-\u33a8\u33ab\u33b3\u33b7\u33b9\u33bd\u33bf\u33c1\u33c2\u33ce\u33d0\u33d4-\u33d6\u33d8\u33d9\u33de\u33df\uff2d\uff4d]',
	'N': '[Nn\xd1\xf1\u0143-\u0149\u01ca-\u01cc\u01f8\u01f9\u1d3a\u1e44-\u1e4b\u207f\u2115\u2116\u24a9\u24c3\u24dd\u3381\u338b\u339a\u33b1\u33b5\u33bb\u33cc\u33d1\uff2e\uff4e]',
	'O': '[Oo\xba\xd2-\xd6\xf2-\xf6\u00f8\u014c-\u0151\u01a0\u01a1\u01d1\u01d2\u01ea\u01eb\u020c-\u020f\u022e\u022f\u1d3c\u1d52\u1ecc-\u1ecf\u2092\u2105\u2116\u2134\u24aa\u24c4\u24de\u3375\u33c7\u33d2\u33d6\uff2f\uff4f]',
	'P': '[Pp\u1d3e\u1d56\u1e54-\u1e57\u2119\u24ab\u24c5\u24df\u3250\u3371\u3376\u3380\u338a\u33a9-\u33ac\u33b0\u33b4\u33ba\u33cb\u33d7-\u33da\uff30\uff50]',
	'Q': '[Qq\u211a\u24ac\u24c6\u24e0\u33c3\uff31\uff51]',
	'R': '[Rr\u0154-\u0159\u0210-\u0213\u02b3\u1d3f\u1d63\u1e58-\u1e5b\u1e5e\u1e5f\u20a8\u211b-\u211d\u24ad\u24c7\u24e1\u32cd\u3374\u33ad-\u33af\u33da\u33db\uff32\uff52]',
	'S': '[Ss\u015a-\u0161\u017f\u0218\u0219\u02e2\u1e60-\u1e63\u20a8\u2101\u2120\u24ae\u24c8\u24e2\u33a7\u33a8\u33ae-\u33b3\u33db\u33dc\ufb06\uff33\uff53]',
	'T': '[Tt\u0162-\u0165\u021a\u021b\u1d40\u1d57\u1e6a-\u1e71\u1e97\u2121\u2122\u24af\u24c9\u24e3\u3250\u32cf\u3394\u33cf\ufb05\ufb06\uff34\uff54]',
	'U': '[Uu\xd9-\xdc\xf9-\xfc\u0168-\u0173\u01af\u01b0\u01d3\u01d4\u0214-\u0217\u1d41\u1d58\u1d64\u1e72-\u1e77\u1ee4-\u1ee7\u2106\u24b0\u24ca\u24e4\u3373\u337a\uff35\uff55]',
	'V': '[Vv\u1d5b\u1d65\u1e7c-\u1e7f\u2163-\u2167\u2173-\u2177\u24b1\u24cb\u24e5\u2c7d\u32ce\u3375\u33b4-\u33b9\u33dc\u33de\uff36\uff56]',
	'W': '[Ww\u0174\u0175\u02b7\u1d42\u1e80-\u1e89\u1e98\u24b2\u24cc\u24e6\u33ba-\u33bf\u33dd\uff37\uff57]',
	'X': '[Xx\u02e3\u1e8a-\u1e8d\u2093\u213b\u2168-\u216b\u2178-\u217b\u24b3\u24cd\u24e7\u33d3\uff38\uff58]',
	'Y': '[Yy\xdd\xfd\xff\u0176-\u0178\u0232\u0233\u02b8\u1e8e\u1e8f\u1e99\u1ef2-\u1ef9\u24b4\u24ce\u24e8\u33c9\uff39\uff59]',
	'Z': '[Zz\u0179-\u017e\u01f1-\u01f3\u1dbb\u1e90-\u1e95\u2124\u2128\u24b5\u24cf\u24e9\u3390-\u3394\uff3a\uff5a]'
};

export function buildFuzzySegementMatcher(segment: string, diacritics=true) {
	return new RegExp(fuzzySegmentMatcherString(segment, diacritics), 'id')
}

export function matchAnyDiacritic(segment: string) {
	let token = ''
	for (let i = 0; i < segment.length; i++) {
		let char = segment[i]
		token += ACCENTS[char.toUpperCase()] ?? char
	}
	return token
}

export function fuzzySegmentMatcherString(segment: string, diacritics=true) {
	const tokens = segment.split(/\s+/)
	let matchString = ''

	for (let index = 0; index < tokens.length; index++) {
		// Escape all regex characters for now
		const escaped = escapeRegExp(tokens[index])

		// Optionally escape diacritics
		const token = diacritics ? matchAnyDiacritic(escaped) : escaped

		matchString += '(' + token + ')'

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
