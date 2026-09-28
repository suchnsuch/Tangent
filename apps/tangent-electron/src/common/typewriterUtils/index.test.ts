import { describe, test, expect } from 'vitest'

import { getEditInfo, getRangeWhile } from '.'
import { Delta } from '@typewriter/delta'
import { Line, TextDocument } from '@typewriter/document'

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

describe('getRangeWhile', () => {
	const doc = new TextDocument([Line.create(new Delta([
		{ insert: '$a$', attributes: { math: { source: 'a', instance: '0-3' } } },
		{ insert: '$a$', attributes: { math: { source: 'a', instance: '3-6' } } },
		{ insert: '![[', attributes: { t_link: { href: 'a.png', instance: '6-16' }, link_internal: 'start' } },
		{ insert: 'a.png', attributes: { t_link: { href: 'a.png', instance: '6-16' }, link_internal: 'href' } },
		{ insert: ']]', attributes: { t_link: { href: 'a.png', instance: '6-16' }, link_internal: 'end' } },
		{ insert: 'x' }
	]))])

	test('Matching on instance stops at an adjacent instance with the same value', () => {
		expect(getRangeWhile(doc, 4, attr => attr?.math?.instance === '3-6')).toEqual([3, 6])
	})

	test('Matching on instance covers every op of a multi-op span', () => {
		expect(getRangeWhile(doc, 10, attr => attr?.t_link?.instance === '6-16')).toEqual([6, 16])
	})
})
