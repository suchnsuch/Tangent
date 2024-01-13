import { matchMarkdownLink, matchWikiLink } from './links'

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
