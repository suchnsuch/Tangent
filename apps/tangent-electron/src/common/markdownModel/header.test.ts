import { describe, expect, it } from 'vitest'

import * as header from './header'

describe('Safe characters', () => {
	it('Should not modify safe text', () => {
		expect(header.safeHeaderLine('My Great Header')).toEqual('My Great Header')
		expect(header.safeHeaderLine('Header & Stuff')).toEqual('Header & Stuff')
	})

	it('Should Remove header formatting', () => {
		expect(header.safeHeaderLine('## This Header Rocks!')).toEqual('This Header Rocks!')
	})

	it('Should Remove conflicting wiki link formatting', () => {
		expect(header.safeHeaderLine('Header | With separator')).toEqual('Header With separator')
		expect(header.safeHeaderLine('Header # with lone hash')).toEqual('Header with lone hash')
	})
})

describe('Format stripping', () => {
	describe('Wiki Links', () => {
		it('Should Strip wiki links', () => {
			expect(header.safeHeaderLine('# Header [[With Link]]')).toEqual('Header With Link')
		})

		it('Should Strip multiple wiki links', () => {
			expect(header.safeHeaderLine('# Header [[A]] [[B]]')).toEqual('Header A B')
		})
	
		it('Should only include text from customized wiki links', () => {
			expect(header.safeHeaderLine('# Header [[With Link|customized]]')).toEqual('Header customized')
		})
	})
	
	describe('Markdown Links', () => {
		it('Should strip md links', () => {
			expect(header.safeHeaderLine('# Header [md link](https://google.com)')).toEqual('Header md link')
		})

		it('Should strip multiple md links', () => {
			expect(header.safeHeaderLine('# Header [a](https://google.com) [b](https://google.com)')).toEqual('Header a b')
		})
	})

	describe('Tags', () => {
		it('Should strip tags', () => {
			expect(header.safeHeaderLine('# Header #Tag')).toEqual('Header Tag')
		})
	})
	
})

