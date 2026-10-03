import { normalizeSeperators } from 'common/paths'

export const FILE_PROTOCOL = 'tangent-file'

/**
 * Custom protocols registered as `standard` expect a host. Rather than relying
 * on an empty one (`tangent-file:///Users/...`), which is inconsistently
 * handled, every url carries this fixed host and the path follows it.
 */
export const FILE_PROTOCOL_HOST = 'local'

export const FILE_PROTOCOL_PREFIX = `${FILE_PROTOCOL}://${FILE_PROTOCOL_HOST}`

/** Matches a bare windows drive, e.g. `C:` */
const driveLetterMatch = /^[A-Za-z]:$/

/**
 * Converts a filesystem path into a tangent-file:// url the renderer can load.
 * @param filepath An absolute path. Windows separators are normalized to '/'.
 * @param cacheBust Appended as a `?t=` query so that a changed file is fetched
 * again instead of being served from the renderer's cache.
 */
export function getFileUrl(filepath: string, cacheBust?: Date | number | string): string {
	if (!filepath) return ''

	// Separators are normalized because otherwise it breaks on Windows. You go Windows.
	let normalized = filepath.replace(/\\/g, '/')

	// Windows paths (`C:/...`) need a leading slash to sit in the url's path.
	if (!normalized.startsWith('/')) {
		normalized = '/' + normalized
	}

	const encoded = normalized
		.split('/')
		.map((segment, index) => {
			// The drive letter keeps its `:` so that decoding can spot it again.
			if (index === 1 && driveLetterMatch.test(segment)) return segment
			// Encoding per-segment covers spaces, `#`, `?`, `%`, and non-ascii
			// names without touching the separators.
			return encodeURIComponent(segment)
		})
		.join('/')

	let url = FILE_PROTOCOL_PREFIX + encoded

	if (cacheBust !== undefined && cacheBust !== null) {
		const value = cacheBust instanceof Date ? cacheBust.getTime() : cacheBust
		// The query technique pulled from https://instructobit.com/tutorial/119/Force-an-image-to-reload-and-refresh-using-Javascript
		url += '?t=' + encodeURIComponent(value.toString())
	}

	return url
}

/**
 * Converts a `tangent-file://` url back into a filesystem path.
 */
export function getFilePathFromUrl(url: string): string {
	const parsed = new URL(url)

	if (parsed.protocol !== FILE_PROTOCOL + ':') {
		throw new Error(`Not a ${FILE_PROTOCOL} url: ${url}`)
	}

	let result = parsed.pathname
		.split('/')
		.map(segment => decodeURIComponent(segment))
		.join('/')

	// Drop the slash that was added to windows paths on the way in.
	const isDrivePath = driveLetterMatch.test(result.slice(1, 3))
	if (isDrivePath) {
		result = result.slice(1)
	}

	// A drive (`C:/...`) or a network share (`//server/...`) came from windows.
	if (isDrivePath || result.startsWith('//')) {
		return normalizeSeperators(result, '\\')
	}

	return result
}
