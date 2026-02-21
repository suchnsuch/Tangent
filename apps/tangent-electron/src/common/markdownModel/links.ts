import { type EmbedInfo, type HrefFormedLink, type LinkInfo, StructureType } from "../indexing/indexTypes"
import type { AttributeMap, TextDocument } from '@typewriter/document'
import { lineToText } from '../typewriterUtils'
import { type TreeNode, validatePath } from 'common/trees'
import paths from '../paths'
import type { DefaultIndexStore } from 'common/indexing/IndexTreeStore'
import { getTagPath } from 'common/indexing/TagNode'
import NoteParser from './NoteParser'
import { ParsingContextType, type ParsingProgram } from './parsingContext'
import { isExternalLink } from 'common/links'

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

// A `[` that is at the beginning of a string or has a non=`\` character in front
const linkStartMatcher = /(?<=^|[^\\])(\[)/

/**
 * Identifies and extracts information about a markdown link in a string
 * @param text The text to check and extract markdown link information from
 * @param startIndex An offset to be applied to the found information (e.g. if the provided text is a slice of a larger string.)
 * @returns Information about the matched link, or null if no link was found
 */
export function matchMarkdownLink(text: string, startIndex=0): LinkInfo {
	const match = text.match(linkStartMatcher)
	if (!match) return null

	const linkStart = match.index

	// Move through matched `[]` pairs
	let depth = 1
	let index = linkStart + 1
	for (; depth > 0 && index < text.length; index++) {
		let char = text[index]
		if (char === '[') {
			depth++
		}
		else if (char === ']') {
			depth--
		}
		else if (char === '\\') {
			// Jump the next character
			index++
		}
	}

	const textEnd = index - 1

	if (depth !== 0 || text[textEnd] !== ']') {
		// A matching `]` could not be found
		return null
	}

	// The next char should be a `(`
	if (text[index] !== '(') return null
	
	index++ 
	depth = 1
	
	// CommonMark feature https://spec.commonmark.org/0.31.2/#example-492
	let useParenthesesDepth = true
	if (text[index] === '<') {
		useParenthesesDepth = false
		index++
	}

	const hrefStart = index

	let hrefEnd = -1
	let contentIdStart = -1
	let contentIdEnd = -1
	let titleStart = -1
	let titleEnd = -1

	// Move through matched `()` pairs, finding content id & title
	for (; depth > 0 && index < text.length; index++) {
		let char = text[index]
		if (!useParenthesesDepth && char === '>') {
			useParenthesesDepth = true
			if (hrefEnd === -1) hrefEnd = index
			if (contentIdStart && contentIdEnd === -1) contentIdEnd = index
		}
		else if (useParenthesesDepth && char === '(') {
			depth++
		}
		else if (useParenthesesDepth && char === ')') {
			depth--
		}
		else if (char === '#' && depth === 1) {
			if (hrefEnd === -1) hrefEnd = index
			contentIdStart = index + 1
		}
		else if (char === ' ' && depth === 1 && titleStart === -1 && text[index + 1] === '"') {
			if (hrefEnd === -1) hrefEnd = index
			if (contentIdStart > 0) contentIdEnd = index
			titleStart = index + 2
			index++ // Hop the `"`
		}
		else if (char === '"' && depth === 1 && titleStart > 0) {
			titleEnd = index
		}
		else if (char === '\\' && titleStart > 0) {
			index++ // Hop the next character
		}
	}

	if (depth !== 0 || text[index - 1] !== ')') {
		return null
	}

	if (hrefEnd === -1) hrefEnd = index - 1

	if (contentIdStart > 0 && contentIdEnd === -1 && titleStart === -1) {
		contentIdEnd = index - 1
	}

	if (contentIdStart > 0 && contentIdEnd === -1 || titleStart > 0 && titleEnd === -1) {
		return null
	}

	const href = text.substring(hrefStart, hrefEnd)
	const content_id = contentIdStart >= 0 ? text.substring(contentIdStart, contentIdEnd) : undefined
	const title = titleStart >= 0 ? text.substring(titleStart, titleEnd).replaceAll('\\', '') : undefined

	const details: LinkInfo = {
		type: StructureType.Link,
		form: 'md',
		start: startIndex + linkStart,
		end: startIndex + index,
		href,
		content_id,
		title
	}

	if (linkStart + 1 !== textEnd) {
		details.text = text.substring(linkStart + 1, textEnd)
	}

	return details
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
			return store.get(link.href) || link.href
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
			if (isExternalLink(link.href)) {
				return link.href
			}
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

export function createContentIdMatcher(contentId: string): RegExp {
	if (!contentId) return null
	if (contentId[0] === '^') {
		// ID matches (technically not supported yet)
		return new RegExp('\^' + contentId.substring(1), 'i')
	}

	// Header matches
	// We want "space-likes" to all be treated the same for cross-compatability & consistency
	const segments = contentId.split(/[-_ ]+|%20/)
	return new RegExp('^' + segments.join('([-_ ]|%20)') + '$', 'i')
}

export function linkTextFromLink(link: HrefFormedLink): string {
	if (!link) return null

	if (link.form === 'md') {
		let href = link.href

		if (link.content_id) {
			href += '#' + link.content_id
		}

		if (link.title) {
			href += ' "' + link.title + '"'
		}

		return `[${link.text}](${href})`
	}

	if (link.form === 'wiki') {
		let result = '[[' + link.href

		if (link.content_id) {
			result += '#' + link.content_id
		}

		if (link.text) {
			result += '|' + link.text
		}

		return result + ']]'
	}
	
	if (link.form === 'raw') {
		return link.href
	}
}

export function parseRawLink(char: string, parser: NoteParser): boolean {
	if (char === ':' && parser.feed.checkFor('://', false)) {
		const { feed, builder } = parser
		const lastLetterIndex = feed.findWhile(/[A-Za-z]/, feed.index - 1, -1)
		let firstChar = lastLetterIndex

		let isEmbed = feed.peek(lastLetterIndex - 1 - feed.index) === '!'
		if (isEmbed) {
			firstChar--
		}

		// Close old data
		parser.commitSpan(null, firstChar - feed.index)

		const isAtStartOfContent = builder.spans.length === 0 || builder.spans[0].attributes.line_format === 'indent'

		feed.consumeUntil(' ')
		const t_link: HrefFormedLink & { block?: boolean } = {
			href: feed.substring(lastLetterIndex, feed.index),
			form: 'raw'
		}

		// Rewind back from invalid terminating characters
		let lastChar = feed.peek(-1)
		while (lastChar.match(/[\.,;]/)) {
			feed.next(-1)
			lastChar = feed.peek(-1)
		}

		const nextSpan: AttributeMap = { t_link }

		const restOfLine = feed.getLineText()

		if (isAtStartOfContent && !restOfLine.trim()) {
			isEmbed = isEmbed || parser.autoEmbedRawLinks
			t_link.block = isEmbed
		}

		if (isEmbed) {
			nextSpan.t_embed = true
			nextSpan.hidden = true
			nextSpan.link_internal = true
		}

		if (t_link.block) {
			feed.nextByLength(restOfLine.length)
		}

		parser.commitSpan(nextSpan, 0)
		return true
	}
	return false
}

export function parseLink(char: string, parser: NoteParser): boolean {
	if (char !== '[') return false

	const { feed, builder } = parser

	const line = feed.getLineText()
	const isEmbed = feed.peek(-1) === '!'

	// Check for a wiki link
	const wikiLinkInfo: LinkInfo | EmbedInfo = matchWikiLink(line, feed.index)
	if (wikiLinkInfo?.start === feed.index) {

		// Commit everything before the `!` in the case of an embed
		parser.commitSpan(null, isEmbed ? -1 : 0)

		const t_link: HrefFormedLink & { block?: boolean } = {
			href: wikiLinkInfo.href,
			form: 'wiki',
			text: wikiLinkInfo.text ?? null,
			content_id: wikiLinkInfo.content_id ?? null
		}

		// Avoiding adding the key unless the value exists
		// helps ensure sane-looking output
		if (isEmbed) {
			// TODO: Convert to allowing indentation for embeds
			t_link.block = parser.lineStart === feed.index - 1
		}
		if (parser.filepath) {
			t_link.from = parser.filepath
		}

		if (isEmbed) {
			builder.addOpenFormat('wiki-link', {
				t_embed: true,
				t_link,
				hiddenGroup: true,
				hidden: true,
				link_internal: true
			})

			parser.commitSpan({ start: true }, 0)
		}
		else {
			builder.addOpenFormat('wiki-link', { t_link })
		}

		if (parser.detailedLinks) {
			wikiLinkInfo.context = feed.getLineText(parser.lineStart)
		}
		if (isEmbed) {
			wikiLinkInfo.start-- // For the `!`
			// Mutate the info into an embed
			;(wikiLinkInfo as any).type = StructureType.Embed
		}
		parser.pushStructure(wikiLinkInfo)

		// Commit the `[[`
		feed.next()
		parser.commitSpan({
			link_internal: true,
			hiddenGroup: true,
			// TODO: option to show/hide the open/close brackets for links
			hidden: true,
			start: true,
			spellcheck: false
		})

		builder.addOpenFormat('wiki-link-internal', wikiLinkInfo.text || isEmbed ? {
			// There is custom link text. Hide href and other elements.
			link_internal: true,
			hidden: true
		} : {
			// No custom text. The link must stand alone.
			link_internal: true,
			hiddenGroup: true
		})

		const endsWithSlash = wikiLinkInfo.href.at(-1) === '/'
		const slashIndex = wikiLinkInfo.href.lastIndexOf('/', endsWithSlash ? wikiLinkInfo.href.length - 2 : undefined)
		const effectiveLength = wikiLinkInfo.href.length - (endsWithSlash ? 1 : 0)
		if (slashIndex >= 0) {
			// Hide the directory section of the link
			feed.next(slashIndex + 1)
			// The directory section
			parser.commitSpan({
				link_internal: 'href directory',
				spellcheck: false,
				hidden: true
			})

			feed.nextByLength(effectiveLength - slashIndex - 1)
		}
		else {
			feed.nextByLength(effectiveLength)
		}

		// Close the href portion
		parser.commitSpan({
			link_internal: 'href',
			spellcheck: false
		})

		// Hide the trailing slash
		if (endsWithSlash) {
			feed.next()
			parser.commitSpan({
				link_internal: 'href directory',
				spellcheck: false,
				hidden: true
			})
		}

		if (wikiLinkInfo.content_id != undefined) {
			// Mark and consume the `#`
			feed.next()
			parser.commitSpan({ link_internal: 'id hashtag' })

			// Mark the rest of the id
			feed.nextByLength(wikiLinkInfo.content_id.length)
			parser.commitSpan({
				link_internal: 'id name',
				spellcheck: false
			})
		}
		
		builder.dropOpenFormat('wiki-link-internal')

		if (wikiLinkInfo.text != undefined) {
			// There is custom link text.
			// Chop off the '|'
			feed.next()
			parser.commitSpan({
				link_internal: true,
				hidden: true,
				spellcheck: false
			})

			builder.addOpenFormat('wiki-link-custom', {
				hiddenGroup: true,
				link_internal: true
			})

			parser.pushContext({
				type: ParsingContextType.Inline,
				indent: parser.lineData.indent.indent,
				programs: [
					awaitWikiLinkAt(feed.index + wikiLinkInfo.text.length),
					...parser.defaultInlineFormattingPrograms
				]
			})
		}
		else {
			// Finish the link now
			finishWikiLink(parser)
		}
		return true
	}
	
	const mdLinkInfo = matchMarkdownLink(line, feed.index)
	if (mdLinkInfo?.start === feed.index && (mdLinkInfo.text || isEmbed)) {
		// Commit everything before the `!` in the case of an embed
		parser.commitSpan(null, isEmbed ? -1 : 0)

		const t_link: HrefFormedLink & { block?: boolean } = {
			href: mdLinkInfo.href,
			form: 'md',
			text: mdLinkInfo.text ?? null,
			content_id: mdLinkInfo.content_id ?? null,
			title: mdLinkInfo.title ?? null
		}

		// Avoiding adding the key unless the value exists
		// helps ensure sane-looking output
		if (isEmbed) {
			// TODO: Convert to allowing indentation for embeds
			t_link.block = parser.lineStart === feed.index - 1
		}
		if (parser.filepath) {
			t_link.from = parser.filepath
		}

		if (isEmbed) {
			builder.addOpenFormat('md-link', {
				t_embed: true,
				t_link,
				hiddenGroup: true,
				hidden: true,
				link_internal: true
			})

			parser.commitSpan({ start: true }, 0)
		}
		else {
			builder.addOpenFormat('md-link', {
				t_link,
				hiddenGroup: true
			})
		}

		// Commit the `[`
		parser.commitSpan({
			link_internal: true,
			hidden: true,
			start: true
		})

		// Commit the text
		if (mdLinkInfo.text) {
			builder.addOpenFormat('md-link-text', {
				link_internal: true
			})

			parser.pushContext({
				type: ParsingContextType.Inline,
				indent: parser.lineData.indent.indent,
				programs: [
					awaitMarkdownLinkAt(feed.index + mdLinkInfo.text.length, mdLinkInfo),
					...parser.defaultInlineFormattingPrograms
				]
			})
		}
		else {
			finishMarkdownLink(parser, mdLinkInfo)
		}

		return true
	}

	return false
}

function awaitWikiLinkAt(index: number): ParsingProgram {
	const next = index + 1
	return (_, parser: NoteParser) => {
		const feedIndex = parser.feed.index
		if (feedIndex === index) {
			parser.commitSpan(null)
			parser.builder.dropOpenFormat('wiki-link-custom')

			finishWikiLink(parser)
			parser.popContext()
			return true
		}
		else if (feedIndex === next) {
			// This can happen if the last parser just consumed the previous character
			parser.commitSpan(null, 0)
			parser.builder.dropOpenFormat('wiki-link-custom')

			finishWikiLink(parser, -1)
			parser.popContext()
			return true
		}
		return false
	}
}

function finishWikiLink(parser: NoteParser, offset=0) {
	const { feed, builder } = parser

	// Commit the `]]`
	feed.next(2 + offset)
	parser.commitSpan({
		link_internal: true,
		hiddenGroup: true,
		// TODO: option to show/hide the open/close brackets for links
		hidden: true,
		end: true,
		spellcheck: false
	})

	builder.dropOpenFormat('wiki-link')
}

function awaitMarkdownLinkAt(index: number, linkInfo: LinkInfo): ParsingProgram {
	const next = index + 1
	return (_, parser: NoteParser) => {
		const feedIndex = parser.feed.index
		if (feedIndex === index) {
			parser.commitSpan(null)
			parser.builder.dropOpenFormat('md-link-text')
			finishMarkdownLink(parser, linkInfo)
			parser.popContext()
			return true
		}
		else if (feedIndex === next) {
			// This can happen if the last parser just consumed the previous character
			parser.commitSpan(null, 0)
			parser.builder.dropOpenFormat('md-link-text')
			finishMarkdownLink(parser, linkInfo, -1)
			parser.popContext()
			return true
		}
		return false
	}
}

function finishMarkdownLink(parser: NoteParser, linkInfo: LinkInfo, offset=0) {
	const { feed, builder } = parser

	// Commit the `](` and link
	feed.next(2 + offset)

	// Skip a leading '<'; CommonMark feature https://spec.commonmark.org/0.31.2/#example-492
	if (feed.peek() === '<') feed.next()
	
	// Consume the link
	feed.nextByLength(linkInfo.href.length)
	if (linkInfo.content_id !== undefined) {
		// Consume the '#' character and the id
		feed.nextByLength(1 + linkInfo.content_id.length)
	}

	// Skip a trailing '>'
	if (feed.peek() === '>') feed.next()

	if (linkInfo.title !== undefined) {
		// Consume the leading ` "` and trailing `"`
		feed.nextByLength(3 + linkInfo.title.length)
	}
	parser.commitSpan({
		link_internal: true,
		hidden: true,
		spellcheck: false
	})

	// Commit the ending `)`
	feed.next()
	parser.commitSpan({
		link_internal: true,
		hidden: true,
		end: true
	})

	builder.dropOpenFormat('md-link')
}
