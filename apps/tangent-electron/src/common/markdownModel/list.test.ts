import { describe, test, expect, it } from 'vitest'

import { getFormOfGlyph, getGlyphForNumber, matchList, ListForm, ListDefinition } from './list'

test('Numeric Extraction', () => {
	expect(getFormOfGlyph('1')).toEqual({
		form: ListForm.Digit,
		index: 1
	})

	expect(getFormOfGlyph('590')).toEqual({
		form: ListForm.Digit,
		index: 590
	})

	expect(getFormOfGlyph('C')).toEqual({
		form: ListForm.AlphaUpper,
		index: 3
	})

	expect(getFormOfGlyph('d')).toEqual({
		form: ListForm.AlphaLower,
		index: 4
	})
})

test('Numeric conversion', () => {
	expect(getGlyphForNumber(ListForm.Digit, 11)).toEqual('11.')
	expect(getGlyphForNumber(ListForm.AlphaLower, 1)).toEqual('a.')
	expect(getGlyphForNumber(ListForm.AlphaLower, 5)).toEqual('e.')
	expect(getGlyphForNumber(ListForm.AlphaUpper, 10)).toEqual('J.')
})

describe('Match List', () => {
	it('Can find bullet', () => {
		expect(matchList('* Hello')).toEqual<ListDefinition>({
			indent: '',
			form: ListForm.Unordered,
			glyph: '*'
		})
		expect(matchList('  - Hello')).toEqual<ListDefinition>({
			indent: '  ',
			form: ListForm.Unordered,
			glyph: '-'
		})
		expect(matchList('\t+ Hello')).toEqual<ListDefinition>({
			indent: '\t',
			form: ListForm.Unordered,
			glyph: '+'
		})
	})

	it('Can find numbers', () => {
		expect(matchList('1. Hello')).toEqual<ListDefinition>({
			indent: '',
			form: ListForm.Digit,
			glyph: '1.',
			index: 1
		})

		expect(matchList('\t4. Hello')).toEqual<ListDefinition>({
			indent: '\t',
			form: ListForm.Digit,
			glyph: '4.',
			index: 4
		})
	})

	it('Can find checkboxes', () => {
		expect(matchList('- [ ] Checkbox!')).toEqual<ListDefinition>({
			indent: '',
			form: ListForm.Unordered,
			glyph: '- [ ]',
			todoState: 'open'
		})
		expect(matchList('- [] Collapsed checkbox!')).toEqual<ListDefinition>({
			indent: '',
			form: ListForm.Unordered,
			glyph: '- []',
			todoState: 'open'
		})
		expect(matchList('+ [x] Checked checkbox!')).toEqual<ListDefinition>({
			indent: '',
			form: ListForm.Unordered,
			glyph: '+ [x]',
			todoState: 'checked'
		})
		expect(matchList('+ [-] Checked checkbox!')).toEqual<ListDefinition>({
			indent: '',
			form: ListForm.Unordered,
			glyph: '+ [-]',
			todoState: 'canceled'
		})
	})
})
