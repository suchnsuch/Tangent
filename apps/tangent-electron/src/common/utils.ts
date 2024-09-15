export function clamp(value: number, min: number, max: number, step?: number) {
	const clamped = Math.min(Math.max(value, min), max)
	if (step !== undefined) {
		let offset = value - min
		let remainder = offset % step

		if (remainder > step / 2) {
			return clamped + step - remainder
		}
		else {
			return clamped - remainder
		}
	}
	return clamped
}

export function enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
    return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
}

const emojiExtractor = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])(.*)/

/** Extracts a first-character emoji, if present */
export function extractLeadingEmoji(value: string) {
	const match = value.match(emojiExtractor)
	if (match) {
		return {
			emoji: match[1],
			remainder: match[2]
		}
	}
	return null
}

export function filterInPlace<T>(list: T[], predicate: (item: T) => boolean) {
	let i = 0
	let j = 0
	for (; i < list.length && j < list.length; i++) {
		const item = list[i]
		if (predicate(item)) {
			list[j] = item
			j++
		}
	}

	while (j < list.length) {
		list.pop()
	}
}
