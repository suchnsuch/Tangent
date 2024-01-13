/*
 * This module aims to be a drop-in replacement for Node's `path` functions
 * for the functions defined. The intention is to provide a common set of
 * functions for use in enviroments where Node is inaccessible, but path
 * manipulations still need to occur.
 * 
 * The module is a drop-in replacement to make transitioning Node code to
 * independent code easier.
 */

/**
 * Splits a path into directory segments
 */
export function segment(aPath:string): string[] {
	return aPath?.split(/[\\/]/)
}

/**
 * If the provided child path is really a child of parent, returns the path
 * under the provided parent. Otherwise returns false.
 * @param parent The prospective parent
 * @param child The prospective child
 * @returns The child path or false if child isn't actually a child of parent
 */
export function getChildPath(parent:string, child:string): string | false {
	// TODO: This seems bad
	if (child.startsWith(parent)) {
		let length = parent.length
		if (!parent.match(/[\\/]$/)) {
			length += 1
		}
		return child.substring(length)
	}
	return false
}

/**
 * Returns the directory name of a path
 * e.g. /my/example/path/file.txt -> /my/example/path
 *  or  /my/example/path/ -> /my/example
 */
export function dirname(aPath: string): string {
	const match = aPath.match(/(.*)([\\/].+$)/)
	return match ? match[1] : '.'
}

/**
 * Returns the path without any directory information
 */
export function basename(aPath: string, anExtension?: string): string {
	let name = aPath.match(/[\\/]?([^\\/]*)[\\/]?$/)[1]
	if (anExtension && name.endsWith(anExtension)) {
		name = name.substring(0, name.length - anExtension.length)
	}
	return name
}

/**
 * Returns the extension of the given path
 */
export function extname(aPath: string): string {
	const name = basename(aPath)
	let match = name.match(/(\.[^\.]+)$/)
	if (match) {
		const result = match[1]
		if (result !== name) {
			return result
		}
	}
	return ''
}

/**
 * Joins segments of a path together into a single path.
 * Leading and trailing path seperators are essentially ignored, with
 * the exception of the beginning of the first and the end of the last
 */
export function join(...segments: string[]): string {
	let result = ''
	let firstIndex = 0

	for (let i = 0; i < segments.length; i++) {
		let segment = segments[i]
		if (segment === '' || segment === '.') {
			if (i === firstIndex) {
				firstIndex++
			}
			continue
		}

		if (i !== firstIndex) {
			segment = segment.replace(/^[\\/]+/, '')
		}
		if (i < segments.length - 1) {
			segment = segment.replace(/[\\/]+$/, '')
		}

		if (i !== firstIndex) {
			result += '/'
		}

		result += segment
	}

	return normalizeSeperators(result)
}

export function resolve(value: string): string {
	let segments = segment(value)

	let resultSegements: string[] = []
	for (const segment of segments) {
		switch (segment) {
			case '.':
				// Skip
				break
			case '..':
				resultSegements.pop()
				break
			default:
				resultSegements.push(segment)
				break
		}
	}

	const bestSeperator = getBestPathSeperator(value)
	return resultSegements.join(bestSeperator)
}

export function getBestPathSeperator(aPath: string) {
	const forwardIndex = aPath.indexOf('/')
	const backwardIndex = aPath.indexOf('\\')

	if (backwardIndex < 0 || (forwardIndex >= 0 && forwardIndex < backwardIndex)) {
		return '/'
	}
	else {
		return '\\'
	}
}

/**
 * Ensures all seperators are the same, based on the first item
 * @param aPath The path to normalize the seperators of
 * @returns 
 */
export function normalizeSeperators(aPath: string, seperator: string = null) {
	const bestSeperator = seperator ?? getBestPathSeperator(aPath)

	if (bestSeperator === '/') {
		return aPath.replace(/\\/g, '/')
	}
	else {
		return aPath.replace(/\//g, '\\')
	}
}

export function makeRegexPathAgnostic(regex: RegExp) {
	return new RegExp(
		regex.source.replace(/\\\//g, '[/\\\\]'),
		regex.flags)
}

export default {
	segment,
	getChildPath,
	dirname,
	basename,
	extname,
	join,
	resolve
}
