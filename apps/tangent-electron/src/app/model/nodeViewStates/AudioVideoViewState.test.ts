import { describe, expect, it } from "vitest"
import { timeFromContentId } from "./AudioVideoViewState"

describe('timeFromContentId', () => {
	it('Gets raw seconds', () => {
		expect(timeFromContentId('time=45')).toEqual(45)
		expect(timeFromContentId('time=145')).toEqual(145)
	})

	it('Parses minutes and seconds', () => {
		expect(timeFromContentId('time=1:23')).toEqual(83)
		expect(timeFromContentId('time=15:10')).toEqual(910)
	})

	it('Parses hours, minutes, and seconds', () => {
		expect(timeFromContentId('time=1:5:10')).toEqual(3600 + 300 + 10)
	})

	it('Can handle trailing decimal values', () => {
		expect(timeFromContentId('time=15.78')).toEqual(15.78)
		expect(timeFromContentId('time=1:10.5')).toEqual(70.5)
	})
})
