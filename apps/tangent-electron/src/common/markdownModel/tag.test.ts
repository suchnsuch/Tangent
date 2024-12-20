import { describe, expect, it } from 'vitest'

import { matchTag } from './tag'

describe('matchTag', () => {
	it('Should find tags starting with a letter', () => {
		expect(matchTag('#foo').names).toEqual(['foo'])
	})
	it('Should find tags with numbers', () => {
		expect(matchTag('#123').names).toEqual(['123'])
	})
	it('Shold find tags with emoji', () => {
		expect(matchTag('#😆').names).toEqual(['😆'])
	})

	it('Should not match spaces', () => {
		expect(matchTag('# test')).toBeNull()
		expect(matchTag('#this thing').names).toEqual(['this'])
	})

	it('Should require empty space before', () => {
		expect(matchTag('space#test')).toBeNull()
	})
	
	it('Should not allow internal # characters', () => {
		expect(matchTag('#test#foo').names).toEqual(['test'])
	})

	it('Should drop trailing seperators', () => {
		expect(matchTag('#test/this//').names).toEqual(['test', 'this'])
		expect(matchTag('#test.this.').names).toEqual(['test', 'this'])
	})

	it('Should not match punctuation', () => {
		expect(matchTag('#test,foo').names).toEqual(['test'])
		expect(matchTag('#test!foo').names).toEqual(['test'])
		expect(matchTag('#test?foo').names).toEqual(['test'])
		expect(matchTag('#test\\foo').names).toEqual(['test'])
		expect(matchTag('#test<foo>').names).toEqual(['test'])
		expect(matchTag('#test(foo)').names).toEqual(['test'])
	})
})
