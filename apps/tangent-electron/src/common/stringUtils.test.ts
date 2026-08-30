import { describe, test, expect, it } from 'vitest'

import { findWordAround, numberOf } from './stringUtils'

describe('findWordAround', () => {
	it('Finds at the start of the line', () => {
		expect(findWordAround('This is a test', 0)).toEqual([0, 4])
		expect(findWordAround('This is a test', 1)).toEqual([0, 4])
		expect(findWordAround('This is a test', 4)).toEqual([0, 4])
	})
	it('Finds in the middle of the line', () => {
		// Matching "is"
		expect(findWordAround('This is a test', 5)).toEqual([5, 7])
		expect(findWordAround('This is a test', 6)).toEqual([5, 7])
		expect(findWordAround('This is a test', 7)).toEqual([5, 7])
	})
	it('Finds in the end of the line', () => {
		expect(findWordAround('This is a test', 10)).toEqual([10, 14])
		expect(findWordAround('This is a test', 11)).toEqual([10, 14])
		expect(findWordAround('This is a test', 14)).toEqual([10, 14])
	})
	it('Finds a single world', () => {
		expect(findWordAround('This', 0)).toEqual([0, 4])
		expect(findWordAround('This', 1)).toEqual([0, 4])
		expect(findWordAround('This', 4)).toEqual([0, 4])
	})
	it('Does nothing when there is nothing', () => {
		expect(findWordAround('   ', 0)).toEqual([0, 0])
		expect(findWordAround('   ', 1)).toEqual([1, 1])
		expect(findWordAround('   ', 3)).toEqual([3, 3])
	})

	it('Finds non-Latin character strings', () => {
		const text = '인류가 거대한 거인들에게'
		expect(findWordAround(text, 2)).toEqual([0, 3])
		expect(findWordAround(text, 5)).toEqual([4, 7])
		expect(findWordAround(text, 9)).toEqual([8, 13])
	})

	it('Does not include text in brackets', () => {
		expect(findWordAround('[foo]', 2)).toEqual([1, 4])
		expect(findWordAround('(foo)', 2)).toEqual([1, 4])
		expect(findWordAround('{foo}', 2)).toEqual([1, 4])
		expect(findWordAround('<foo>', 2)).toEqual([1, 4])
	})

	it('Does not include slashes', () => {
		expect(findWordAround('one|two', 1)).toEqual([0, 3])
		expect(findWordAround('one|two', 5)).toEqual([4, 7])
		expect(findWordAround('one/two', 1)).toEqual([0, 3])
		expect(findWordAround('one\\two', 1)).toEqual([0, 3])
	})

	it('Does not include punctuation', () => {
		expect(findWordAround('"foo"', 2)).toEqual([1, 4])
		expect(findWordAround(',foo,', 2)).toEqual([1, 4])
		expect(findWordAround('.foo.', 2)).toEqual([1, 4])
		expect(findWordAround("'foo'", 2)).toEqual([1, 4])
		expect(findWordAround('*foo*', 2)).toEqual([1, 4])
		expect(findWordAround('`foo`', 2)).toEqual([1, 4])
		expect(findWordAround(';foo;', 2)).toEqual([1, 4])
		expect(findWordAround(':foo:', 2)).toEqual([1, 4])
		expect(findWordAround('@foo@', 2)).toEqual([1, 4])
		expect(findWordAround('#foo#', 2)).toEqual([1, 4])
		expect(findWordAround('$foo$', 2)).toEqual([1, 4])
		expect(findWordAround('%foo%', 2)).toEqual([1, 4])
		expect(findWordAround('^foo^', 2)).toEqual([1, 4])
		expect(findWordAround('&foo&', 2)).toEqual([1, 4])
		expect(findWordAround('?foo?', 2)).toEqual([1, 4])
		expect(findWordAround('!foo!', 2)).toEqual([1, 4])
		expect(findWordAround('~foo~', 2)).toEqual([1, 4])
	})
})

describe('numberOf', () => {
	it('Should find the correct number', () => {
		expect(numberOf('(', '((foo(')).toEqual(3)
	})
	it('Should return 0 if nothing is found', () => {
		expect(numberOf('x', 'yyy')).toEqual(0)
	})
})
