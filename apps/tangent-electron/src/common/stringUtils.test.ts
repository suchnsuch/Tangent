import { describe, test, expect } from 'vitest'

import { findWordAround } from './stringUtils'

describe('findWordAround', () => {
	test('Start of line', () => {
		expect(findWordAround('This is a test', 0)).toEqual([0, 4])
		expect(findWordAround('This is a test', 1)).toEqual([0, 4])
		expect(findWordAround('This is a test', 4)).toEqual([0, 4])
	})
	test('Middle of line', () => {
		// Matching "is"
		expect(findWordAround('This is a test', 5)).toEqual([5, 7])
		expect(findWordAround('This is a test', 6)).toEqual([5, 7])
		expect(findWordAround('This is a test', 7)).toEqual([5, 7])
	})
	test('End of line', () => {
		expect(findWordAround('This is a test', 10)).toEqual([10, 14])
		expect(findWordAround('This is a test', 11)).toEqual([10, 14])
		expect(findWordAround('This is a test', 14)).toEqual([10, 14])
	})
	test('Only thing on line', () => {
		expect(findWordAround('This', 0)).toEqual([0, 4])
		expect(findWordAround('This', 1)).toEqual([0, 4])
		expect(findWordAround('This', 4)).toEqual([0, 4])
	})
	test('Nothing on line', () => {
		expect(findWordAround('   ', 0)).toEqual([0, 0])
		expect(findWordAround('   ', 1)).toEqual([1, 1])
		expect(findWordAround('   ', 3)).toEqual([3, 3])
	})
})