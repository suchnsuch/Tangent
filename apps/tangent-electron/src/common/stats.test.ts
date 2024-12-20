import { describe, test, expect } from 'vitest'

import { percentRange } from './stats'

describe('Percent Range', () => {
	test('Can find top quarter', () => {
		expect(percentRange([1, 2, 3, 4], .75, 1)).toEqual(4)
	})
	test('Can find bottom quarter', () => {
		expect(percentRange([1, 2, 3, 4], 0, .25)).toEqual(1)
	})
	test('Can find middle half', () => {
		expect(percentRange([1, 2, 3, 4], .25, .75)).toEqual(2.5)
	})

	test('Can handle unsorted lists', () => {
		expect(percentRange([3, 2, 4, 1], .75, 1)).toEqual(4)
	})
})
