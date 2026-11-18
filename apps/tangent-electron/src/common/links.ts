import { FILE_PROTOCOL_PREFIX } from "./fileUrl"

// From http://urlregex.com
const externalLinkMatch = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/

export function isExternalLink(link: string) {
	if (!link) return false
	if (link.startsWith(FILE_PROTOCOL_PREFIX)) return false
	return link.match(externalLinkMatch) != null
}

// Dead simple
const rootLinkMatch = /^\/|\\/
export function isRootLink(link: string) {
	return link?.match(rootLinkMatch)
}
