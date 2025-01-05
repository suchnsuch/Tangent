import { EmbedInfo, HrefFormedLink, LinkInfo, StructureType } from "../indexing/indexTypes"
import type { AttributeMap, TextDocument } from '@typewriter/document'
import { lineToText } from '../typewriterUtils'
import { TreeNode, TreePredicateResult, validatePath } from 'common/trees'
import paths from '../paths'
import type { DefaultIndexStore } from 'common/indexing/IndexTreeStore'
import { getTagPath } from 'common/indexing/TagNode'
import NoteParser from './NoteParser'
import { ParsingContextType, ParsingProgram } from './parsingContext'
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

		if (depth !== 0 || text[index - 1] !== ')') {
			return null
		}

		let details: LinkInfo = {
			type: StructureType.Link,
			form: 'md',
			start: startIndex + match.index,
			end: startIndex + index,
			href: text.substring(linkStart, index - 1)
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
			form: 'wiki'
		}

		// Avoiding adding the key unless the value exists
		// helps ensure sane-looking output
		if (isEmbed) {
			// TODO: Convert to allowing indentation for embeds
			t_link.block = parser.lineStart === feed.index - 1
		}
		if (wikiLinkInfo.content_id) {
			t_link.content_id = wikiLinkInfo.content_id
		}
		if (wikiLinkInfo.text) {
			t_link.text = wikiLinkInfo.text
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

		let slashIndex = wikiLinkInfo.href.lastIndexOf('/')
		if (slashIndex >= 0) {
			// Hide the directory section of the link
			feed.next(slashIndex + 1)
			// The directory section
			parser.commitSpan({
				link_internal: 'href directory',
				spellcheck: false,
				hidden: true
			})

			feed.nextByLength(wikiLinkInfo.href.length - slashIndex - 1)
		}
		else {
			feed.nextByLength(wikiLinkInfo.href.length)
		}

		// Close the href portion
		parser.commitSpan({
			link_internal: 'href',
			spellcheck: false
		})

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
			form: 'md'
		}

		// Avoiding adding the key unless the value exists
		// helps ensure sane-looking output
		if (isEmbed) {
			// TODO: Convert to allowing indentation for embeds
			t_link.block = parser.lineStart === feed.index - 1
		}
		if (mdLinkInfo.text) {
			t_link.text = mdLinkInfo.text
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
	return (_, parser: NoteParser) => {
		if (parser.feed.index === index) {
			parser.commitSpan(null)
			parser.builder.dropOpenFormat('wiki-link-custom')

			finishWikiLink(parser)
			parser.popContext()
			return true
		}
		return false
	}
}

function finishWikiLink(parser: NoteParser) {
	const { feed, builder } = parser

	// Commit the `]]`
	feed.next(2)
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
	return (_, parser: NoteParser) => {
		if (parser.feed.index === index) {
			parser.commitSpan(null)
			parser.builder.dropOpenFormat('md-link-text')
			finishMarkdownLink(parser, linkInfo)
			parser.popContext()
			return true
		}
		return false
	}
}

function finishMarkdownLink(parser: NoteParser, linkInfo: LinkInfo) {
	const { feed, builder } = parser

	// Commit the `](` and link
	feed.next(2)
	feed.nextByLength(linkInfo.href.length)
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
