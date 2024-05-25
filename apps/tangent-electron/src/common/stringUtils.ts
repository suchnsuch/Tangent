import { clamp } from './utils'

/**
 * Moves through a string character by character so long as the character matches.
 * @param text The string to move through.
 * @param match The expression that a character needs to match.
 * @param start The starting index.
 * @param direction Whether to move forward (1) or backward (-1) from the starting position.
 * @returns {Object} details The result details
 * @returns {number} details.index The inclusive starting index when direction=-1 or the _exclusive_ ending index when direction=1
 * @returns {boolean} details.foundAnyMatches Whether or not matching characters were found.
 * @returns {string} details.char The last matching character in the given direction.
 */
export function searchWhileCharacterMatches(text: string, match: RegExp, start: number, direction:(1|-1)=1, stopOnNewLine=true) {
	let index = start + direction
	let foundAnyMatches = false
	while (index >= 0 && index < text.length) {
		let char = text[index]
		if (!char.match(match) || stopOnNewLine && char === '\n') {
			if (direction < 0) {
				// Only adjust when going back as start is inclusive.
				index -= direction
				char = text[index]
			}
			else {
				// Still want to adjust the char back
				char = text[index - direction]
			}
			
			return {
				index,
				foundAnyMatches,
				char
			}
		}
		foundAnyMatches = true
		index += direction
	}

	// Initial movement can cause overshoot
	index = clamp(index, 0, text.length)

	return {
		index,
		foundAnyMatches,
		char: text[index]
	}
}

export function findWordAround(text: string, position: number) {
	const match = /[\w\d_-]/
	const behindSearch = searchWhileCharacterMatches(text, match, position, -1)
	const wordStart = behindSearch.foundAnyMatches ? behindSearch.index : position
	const aheadSearch = searchWhileCharacterMatches(text, match, position - 1, 1)
	const wordEnd = aheadSearch.foundAnyMatches ? aheadSearch.index : position

	return [wordStart, wordEnd]
}

export function findCharactersBetweenWhitespace(text: string, position: number) {
	const match = /\S/
	const behindSearch = searchWhileCharacterMatches(text, match, position, -1)
	const wordStart = behindSearch.foundAnyMatches ? behindSearch.index : position
	const aheadSearch = searchWhileCharacterMatches(text, match, position - 1, 1)
	const wordEnd = aheadSearch.foundAnyMatches ? aheadSearch.index : position

	return [wordStart, wordEnd]
}

export function padString(text: string, length: number) {
	while (text.length < length) {
		text += ' '
	}
	return text
}
