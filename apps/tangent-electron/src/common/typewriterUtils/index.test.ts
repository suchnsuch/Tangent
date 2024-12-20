import { describe, test, expect } from 'vitest'

import { getEditInfo } from '.'
import { Delta } from '@typewriter/delta'

describe('Edit Info', () => {
	test('Raw Delta insert', () => {
		expect(getEditInfo(new Delta([
			{ retain: 4 },
			{ insert: 'Foo' },
			{ retain: 3 }
		]))).toEqual({ offset: 4, insert: 'Foo', shift: 3 })

		expect(getEditInfo(new Delta([
			{ retain: 5 },
			{ insert: 'Food' }
		]))).toEqual({ offset: 5, insert: 'Food', shift: 4 })

		expect(getEditInfo(new Delta([
			{ insert: 'G' }
		]))).toEqual({ offset: 0, insert: 'G', shift: 1 })
	})

	test('Raw Delta delete', () => {
		expect(getEditInfo(new Delta([
			{ retain: 4 },
			{ delete: 3 },
			{ retain: 3 }
		]))).toEqual({ offset: 4, shift: -3 })

		expect(getEditInfo(new Delta([
			{ delete: 1 }
		]))).toEqual({ offset: 0, shift: -1 })
	})

	test('Compound retain insert', () => {
		expect(getEditInfo(new Delta([
			{ retain: 4 },
			{ retain: 2 },
			{ retain: 12 },
			{ insert: 'Foo' },
			{ retain: 3 }
		]))).toEqual({ offset: 18, insert: 'Foo', shift: 3 })
	})

	test('Compound retain delete', () => {
		expect(getEditInfo(new Delta([
			{ retain: 4 },
			{ retain: 2 },
			{ retain: 12 },
			{ delete: 1 },
			{ retain: 3 },
			{ retain: 16 }
		]))).toEqual({ offset: 18, shift: -1 })
	})
})
