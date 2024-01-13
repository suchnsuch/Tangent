const numberExtractor = /(\D+)?(\d+)(.*)/

export function stringSort(a: string, b: string) {
	if (a < b) {
		return -1
	}
	if (a > b) {
		return 1
	}
	return 0
}


export type NumberedStringSortCache =  Map<string, RegExpMatchArray>
export function numberedStringSort(a: string, b: string, cache: NumberedStringSortCache) {
	if (a === b) return 0

	let matchA: RegExpMatchArray = cache.get(a)
	let matchB: RegExpMatchArray = cache.get(b)

	if (matchA === undefined) {
		matchA = a.match(numberExtractor)
		cache.set(a, matchA)
	}

	if (matchB === undefined) {
		matchB = b.match(numberExtractor)
		cache.set(b, matchB)
	}
	
	if (matchA && matchB && matchA[1] === matchB[1]) {
		const numA = parseFloat(matchA[2])
		const numB = parseFloat(matchB[2])

		if (numA === numB) {
			return numberedStringSort(matchA[3], matchB[3], cache)
		}

		return numA - numB
	}
	if (a < b) {
		return -1
	}
	if (a > b) {
		return 1
	}
	return 0
}
