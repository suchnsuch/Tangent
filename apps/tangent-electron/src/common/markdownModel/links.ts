import { HrefFormedLink, LinkInfo, StructureType } from "../indexing/indexTypes"
import type { TextDocument } from '@typewriter/document'
import { lineToText } from '../typewriterUtils'
import { TreeNode, TreePredicateResult, validatePath } from 'common/trees'
import paths from '../paths'
import type { DefaultIndexStore } from 'common/indexing/IndexTreeStore'
import { getTagPath } from 'common/indexing/TagNode'

export const wikiLinkMatcher = /(\[\[)([^\[\]\n|#]*)(#[^\[\]\n|#]*)?(\|[^\[\]\n|#]*)?(\]\])?/

interface ExtendedLinkInfo extends LinkInfo {
	complete?: boolean
}

export function matchWikiLink(text: string, startIndex=0, options?: {
	allowIncomplete?: boolean,
	snipFormatCharacters?: boolean
}): ExtendedLinkInfo {
	const match = text.match(wikiLinkMatcher)
	if (match && (options?.allowIncomplete || match[5])) {
		const snipFormatCharacters = options?.snipFormatCharacters ?? true
		let details: ExtendedLinkInfo = {
			type: StructureType.Link,
			form: 'wiki',
			start: startIndex + match.index,
			end: startIndex + match.index + match[0].length,
			href: match[2]
		}

		if (match[4]) {
			// Optionally chop off the `|`
			details.text = snipFormatCharacters ? match[4]?.substr(1) : match[4] 
		}

		if (match[3]) {
			// Optionally chop off the `#`
			details.content_id = snipFormatCharacters ? match[3].substr(1) : match[3]
		}

		if (options?.allowIncomplete && match[5]) {
			// No need to mark this otherwise
			details.complete = true
		}

		return details
	}
	return null
}

export const linkStartMatcher = /(\[)([^\[\]\n]*)(\])(\()/
const bracketMatch = /[\(\)]/ 

export function matchMarkdownLink(text: string, startIndex=0): LinkInfo {
	const match = text.match(linkStartMatcher)
	if (match) {

		const linkStart = match.index + match[0].length

		let depth = 1
		let index = linkStart + 1
		for (; depth > 0 && index < text.length; index++) {
			let char = text[index]
			if (char === '(') {
				depth++
			}
			else if (char === ')') {
				depth--
			}
		}

		index-- // Pull back

		if (depth !== 0 || text[index] !== ')') {
			return null
		}

		let details: LinkInfo = {
			type: StructureType.Link,
			form: 'md',
			start: startIndex + match.index,
			end: startIndex + index,
			href: text.substring(linkStart, index)
		}
		if (match[2]) {
			details.text = match[2]
		}
		return details
	}
	return null
}

export function findLinkAround(doc: TextDocument, position: number, linkMatcher: (text: string, startIndex: number) => LinkInfo) {
	const line = doc.getLineAt(position)
	const [start, end] = doc.getLineRange(line)
	let lineText = lineToText(line)

	let lineStart = start
	let result: LinkInfo = null
	do {
		result = linkMatcher(lineText, lineStart)
		if (result.start <= position && position <= result.end) {
			break
		}
		const matchEnd = result.end
		lineStart += matchEnd // For translating back to document space
		lineText = lineText.substr(matchEnd)
	}
	while (result)

	return result
}

/**
 * Resolve the link to a workspace file or to an external link
 * @param store A directory store to resolve the link with.
 * @param link The link info to resolve.
 * @returns The TreeNode, array of TreeNodes, or joined string
 */
export function resolveLink(store: DefaultIndexStore, link: HrefFormedLink): TreeNode | TreeNode[] | string {
	switch (link.form) {
		case 'raw':
			return store.get(link.href)
		case 'wiki':
			const validatedHref = validatePath(link.href)
			if (!validatedHref) {
				if (link.href === '' && link.from && link.content_id) {
					// This is a local content_id link
					// Resolve to where it came from
					return store.get(link.from)
				}
				console.warn('Invalid href', link)
				return
			}
			return store.getMatchesForPath(validatedHref, {
				bestOnly: true,
				root: store.files
			})
		case 'md':
			if (!link.from) {
				console.error('Cannot resolve a md link without "from".', link)
				return
			}
			const origin = store.get(link.from)
			if (origin) {
				let relativeRoot = origin.path
				if (origin.fileType !== 'folder') {
					relativeRoot = store.getParent(origin)?.path
				}

				if (relativeRoot == undefined) {
					console.error('Could not find relative root for', origin.path)
					return
				}

				const filePath = paths.resolve(paths.join(relativeRoot, link.href))
				return store.get(filePath) ?? filePath
			}
			return
		case 'tag':
			return store.get(link.to ?? getTagPath(link.href))
		case 'front-matter':
			switch (link.type) {
				case StructureType.Tag:
					return store.get(link.to ?? getTagPath(link.href))
				default:
					console.error('Invalid link type for form "front-matter"', link)
					return
			}
		default:
			console.error('Invalid link form', link);
			return
	}
}
