// From http://urlregex.com
const externalLinkMatch = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/

export function isExternalLink(link: string) {
	return link?.match(externalLinkMatch) != null
}

// Dead simple
const rootLinkMatch = /^\/|\\/
export function isRootLink(link: string) {
	return link?.match(rootLinkMatch)
}
