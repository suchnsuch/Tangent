import { StructureType } from 'common/indexing/indexTypes'
import { matchMarkdownLink, matchWikiLink } from './links'
import NoteParser from './NoteParser'
import { AttributeMap } from 'typewriter-editor'

export const headerMatcher = /^(#+ )(.*)/

export function safeHeaderLine(text: string) {
	if (!text) return null

	// Remove leading header text
	const format = text.match(headerMatcher)
	if (format) text = format[2]


	// Strip off all wiki links
	let wikiLinkMatch = matchWikiLink(text)
	while (wikiLinkMatch) {
		text = text.substring(0, wikiLinkMatch.start) +
			(wikiLinkMatch.text ?? wikiLinkMatch.href) +
			text.substring(wikiLinkMatch.end)

		wikiLinkMatch = matchWikiLink(text)
	}


	// Strip off all markdown links
	let mdLinkMatch = matchMarkdownLink(text)
	while (mdLinkMatch) {
		text = text.substring(0, mdLinkMatch.start) +
			(mdLinkMatch.text ?? '') +
			text.substring(mdLinkMatch.end)

		mdLinkMatch = matchMarkdownLink(text)
	}

	// Remove bad characters
	text = text.replace(/[^\w\d-_ &%$!]+/g, '')

	// Condense spaces
	return text.replace(/ +/g, ' ')
}

export function parseHeader(char: string, parser: NoteParser): boolean {
	if (!parser.isStartOfContent || char !== '#') return false
	
	const { feed } = parser
	const start = feed.index
	const count = feed.consumeSequentialCharacters('#')
	if (feed.peek() !== ' ') return false
	feed.next()
	parser.lineData.header = count
	const nextSpan: AttributeMap = { line_format: true }
	if (feed.peek() !== '\n') {
		// We don't want to hide headers with no text
		nextSpan.hidden = true
	}
	parser.commitSpan(nextSpan)

	const line = feed.getLineText(start)

	parser.pushStructure({
		type: StructureType.Header,
		level: count,
		text: safeHeaderLine(line),
		start,
		end: start + line.length
	})

	return true
}
