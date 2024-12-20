import { describe, test, expect } from 'vitest'

import { getTextAnnotations } from './queryAnnotations'

function toPartial(regex: RegExp) {
	if (!regex.flags.includes('d')) {
		regex = RegExp(regex.source, regex.flags + 'd')
	}
	return { regex }
}

describe('Regex annotations', () => {
	test('single', () => {
		const partial = toPartial(/Test/)
		expect(getTextAnnotations('My Test of thing', partial)).toEqual([
			{
				start: 3,
				end: 7,
				data: partial
			}
		])
	})

	test('global', () => {
		const partial = toPartial(/Test/g)
		expect(getTextAnnotations('My Test of Test thing', partial)).toEqual([
			{
				start: 3,
				end: 7,
				data: partial
			},
			{
				start: 11,
				end: 15,
				data: partial
			}
		])
	})

	test('Groups', () => {
		const partial = toPartial(/(Test).*(thing)/)
		expect(getTextAnnotations('My Test of thing and stuff', partial)).toEqual([
			{
				start: 3,
				end: 16,
				data: { ...partial, group: 0 }
			},
			{
				start: 3,
				end: 7,
				data: { ...partial, group: 1 }
			},
			{
				start: 11,
				end: 16,
				data: { ...partial, group: 2 }
			}
		])
	})
})
