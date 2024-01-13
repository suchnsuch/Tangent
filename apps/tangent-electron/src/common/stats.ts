export function mean(values: number[]) {
	return values.reduce((prev, next) => prev + next, 0) / values.length
}

export function percentRange(values: number[], lowerBound: number, upperBound: number) {
	const sortedNumbers = values.slice().sort((a, b) => a - b)
	const count = sortedNumbers.length

	const lowerIndex = Math.ceil(lowerBound * count)
	const higherIndex = Math.floor(upperBound * count)

	return mean(sortedNumbers.slice(lowerIndex, higherIndex))
}
