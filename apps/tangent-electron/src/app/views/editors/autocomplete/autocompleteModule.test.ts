import { describe, test, expect } from 'vitest'

import { Delta } from 'typewriter-editor'
import { adjustRangeByChange } from './autocompleteModule'

describe('Range Adjustments', () => {
	test('Insertions out of range', () => {
		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 1 },
			{ insert: 'f' }
		]))).toEqual(false)

		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 10 },
			{ insert: 'f' }
		]))).toEqual(false)
	})

	test('Insertions in range', () => {
		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 4 },
			{ insert: 'f' }
		]))).toEqual([4, 7]) // Character inserted

		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 6 },
			{ insert: 'hi' }
		]))).toEqual([4, 8]) // inserted 2 on edge
	})

	test('Inserting spaces', () => {
		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 6 },
			{ insert: ' ' }
		]))).toEqual([4, 7]) // inserted space on edge
	})

	test('Deletions out of range', () => {
		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 3 },
			{ delete: 1 }
		]))).toEqual(false)

		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 10 },
			{ delete: 1 }
		]))).toEqual(false)
	})

	test('Deletion on left edge', () => {
		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 4 },
			{ delete: 1 }
		]))).toEqual([4, 5]) // deleted beyond the range
	})

	test('Deletions in range', () => {
		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 5 },
			{ delete: 1 }
		]))).toEqual([4, 5]) // deleted, range reduced
	})

	test('Deletions on right edge', () => {
		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 5 },
			{ delete: 3 }
		]))).toEqual(false) // deletes beyond the range

		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 6 },
			{ delete: 1 }
		]))).toEqual(false) // acts outside the range
	})

	test('Deletions and insertions in range', () => {
		expect(adjustRangeByChange([4, 6], new Delta([
			{ retain: 5 },
			{ delete: 1 },
			{ insert: 'hi' }
		]))).toEqual([4, 7]) // deleted 1, inserted 2
	})
})
