import { findFullCharacterForward, findFullCharacterReverse } from '@such-n-such/core'

const formatCharacters = ['_', '*', '`']

export default class CharacterFeeder {

	text: string
	index: number

	currentChar: string

	constructor(text: string) {
		this.text = text
		this.index = -1
		this.next()
	}

	/**
	 * Whether the feeder has more content
	 * @param hard Set to true to continue beyond any scoped range
	 */
	hasMore(hard=false) {
		return this.index < this.text.length
	}

	get isStartOfDocument(): boolean {
		return this.index === 0
	}

	get currentStepLength() {
		return this.currentChar?.length ?? 1
	}

	private step(step = 1, withSurrogates = true) {
		let index = this.index
		let stepLength = 1

		if (step >= 0) {
			if (!withSurrogates) {
				index += step - 1
				step = 1
				stepLength = 1
			}
			else {
				stepLength = this.currentStepLength
			}
			while (step > 0) {
				index += stepLength
				const fullChar = findFullCharacterForward(this.text, index)
				stepLength = fullChar?.length ?? 1
				step--
			}
		}
		else {
			if (!withSurrogates) {
				index -= step + 1
				step = -1
			}
			while (step < 0) {
				const fullChar = findFullCharacterReverse(this.text, index)
				stepLength = fullChar?.length ?? 1
				index -= stepLength
				step++
			}
		}
		
		const text = index + stepLength <= this.text.length
			? this.text.substring(index, index + stepLength)
			: undefined
		return { index, text }
	}

	private setIndex(index: number, stepLength=1) {
		this.index = index
		this.currentChar = index + stepLength <= this.text.length
			? this.text.substring(index, index + stepLength)
			: undefined
	}

	/**
	 * Move to the next character
	 * @param step The number of characters to jump (can be negative). A value of 1 or -1 will take into account surrogate pairs
	 * @param hard Set to true to continue beyond any scoped range
	 * @returns The new current character
	 */
	next(step = 1, hard=false) {
		const { index, text } = this.step(step)
		this.index = index
		this.currentChar = text
		return text
	}

	nextByLength(length: number) {
		const { index, text } = this.step(length, false)
		this.index = index
		this.currentChar = text
		return text
	}

	peek(step = 1) {
		const { index, text } = this.step(step)
		if (index >= 0 && index < this.text.length) {
			return text
		}
		return '\n'
	}

	// TODO: this should be more generic
	peekNextNonFormatCharacter(start?: number) {
		let index = start ?? this.index + 1
		while (index < this.text.length) {
			const char = this.text[index]
			if (!formatCharacters.includes(char)) {
				return char
			}
			index++
		}
		return `\n`
	}

	// TODO: this should be more generic
	peekLastNonFormatCharacter(start?: number) {
		let index = start ?? this.index - 1
		while (index >= 0) {
			const char = this.text[index]
			if (!formatCharacters.includes(char)) {
				return char
			}
			index--
		}
		return `\n`
	}

	/**
	 * Checks for a given value
	 * @param value The value to check for
	 * @param consumeIfMatch If true and a match is found, the feed is placed at the last character of the found string
	 * @param index The override index to use
	 * @returns true if a match is found else false
	 */
	checkFor(value:string, consumeIfMatch=true, index?: number) {
		index = index ?? this.index
		if (value.length > this.text.length - index) {
			return false
		}
		if (value === this.text.substring(index, index + value.length)) {
			if (value.length > 1 && consumeIfMatch) {
				this.setIndex(this.index + value.length - 1)
			}
			return true
		}
		return false
	}

	consumeSequentialCharacters(char: string, max = Number.POSITIVE_INFINITY): number {
		let consuming = true
		let total = 0
		while (consuming && this.hasMore() && total < max) {
			consuming = this.currentChar === char
			if (consuming) {
				total++
				this.next()
			}
		}
		if (total > 0) {
			// Rewind one character so that the index is on the last hit
			this.setIndex(this.index - char.length, char.length)
		}
		return total
	}

	/**
	 * Walks through the feed until the given string is found.
	 * Returns the number of characters skipped over to get to the start of the match
	 */
	consumeUntil(value: string, stopOnNewLine=true) {
		let total = 0
		const firstChar = value[0]
		while (this.hasMore()) {
			if (stopOnNewLine && this.currentChar === '\n') {
				return {
					contentCount: total,
					foundMatch: false
				}
			}
			else if (this.currentChar === firstChar) {
				if (this.checkFor(value, true)) {
					return {
						contentCount: total,
						foundMatch: true
					}
				}
			}
			total += this.currentStepLength
			this.next()
		}

		return {
			contentCount: total,
			foundMatch: false
		}
	}

	/**
	 * Walks through the feed until a given string is found.
	 * Does _not_ consume characters. Can't understand surrogate pairs.
	 * Returns the characters skipped to find the match.
	 */
	findNext(value: string, stopOnNewLine=true) {
		const firstChar = value[0]
		let total = 0
		let index = this.index
		let currentChar = this.currentChar
		while (index < this.text.length) {
			if (stopOnNewLine && currentChar === '\n') {
				return {
					contentCount: total,
					foundMatch: false
				}
			}
			else if (currentChar === firstChar) {
				if (this.checkFor(value, false, index)) {
					return {
						contentCount: total,
						foundMatch: true
					}
				}
			}
			index++
			currentChar = this.text[index]
			total += currentChar?.length ?? 1
		}

		return {
			contentCount: total,
			foundMatch: false
		}
	}

	/**
	 * Searches text in a given direction so long as each character passes a regex match.
	 * @param match The match that each character will be checked against.
	 * @param start The index from which checking will start. Defaults to the current index.
	 * @param direction The direction in which checking goes.
	 * @param stopOnNewLine Whether or not to stop looking when `\n` is found.
	 * @returns The last index
	 */
	findWhile(match: RegExp, start?: number, direction:1|-1 = 1, stopOnNewLine = true): number {
		start = start ?? this.index
		let index = start
		while (index >= 0 && index < this.text.length) {
			const char = this.text[index]
			if (stopOnNewLine && char === '\n') {
				index -= direction // Adjust direction back
				break
			}
			if (char.match(match)) {
				index += direction
			}
			else {
				index -= direction // Adjust direction back
				break
			}
		}

		return index
	}

	findBehind(value: string, start?: number, stopOnNewLine=true) {
		const firstChar = value[0]
		let index = start ?? this.index - 1
		while (index >= 0) {
			const char = this.text[index]
			if (stopOnNewLine && char === '\n') {
				index++ // Adjust index forward to ignore the newline
				return {
					index: index,
					foundMatch: false,
					char: this.text[index]
				}
			}
			else if (char === firstChar && this.checkFor(value, false, index)) {
				return {
					index,
					foundMatch: true,
					char
				}
			}
			index--
		}

		return {
			index,
			foundMatch: false,
			char: this.text[index]
		}
	}

	substring(start: number, end: number) {
		return this.text.substring(start, end)
	}

	getLineText(from = this.index, consume=false) {
		let next = this.text.indexOf('\n', from)
		if (next < 0) {
			if (consume) {
				// There is no more text
				this.setIndex(this.text.length)
			}
			return this.text.substring(from)
		}
		if (consume) {
			this.setIndex(next)
		}
		return this.text.substring(from, next)
	}
}