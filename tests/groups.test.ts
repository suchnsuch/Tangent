import { ClauseType } from '../src/types'
import { parse } from './test-loader'

describe('Explicit Groups', () => {
	test('Trailing intra-clause Group', async () => {
		const result = await parse('Notes with "my text" and ("this" or "that")')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					text: 'my text'
				},
				{
					join: 'or',
					clauses: [
						{
							type: ClauseType.With,
							text: 'this'
						},
						{
							type: ClauseType.With,
							text: 'that'
						}
					]
				}
			]
		})
	})

	test('Leading intra-clause Group', async () => {
		const result = await parse('Notes with ("this" or "that") and "my text"')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					join: 'or',
					clauses: [
						{
							type: ClauseType.With,
							text: 'this'
						},
						{
							type: ClauseType.With,
							text: 'that'
						}
					]
				},
				{
					type: ClauseType.With,
					text: 'my text'
				}
			]
		})
	})

	test('Inter clause grouping', async () => {
		const result = await parse('Notes with "my text" and (in [[place]] or linked from [[location]])')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					text: 'my text'
				},
				{
					join: 'or',
					clauses: [
						{
							type: ClauseType.In,
							reference: 'place'
						},
						{
							type: ClauseType.LinkedFrom,
							reference: 'location'
						}
					]
				}
			]
		})
	})

	test('Nested groups', async () => {
		const result = await parse('Notes with "my text" and ((in [[place]] or [[folder]]) and linked from [[location]])')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					text: 'my text'
				},
				{
					join: 'and',
					clauses: [
						{
							join: 'or',
							clauses: [
								{
									type: ClauseType.In,
									reference: 'place'
								},
								{
									type: ClauseType.In,
									reference: 'folder'
								}
							]
						},
						{
							type: ClauseType.LinkedFrom,
							reference: 'location'
						}
					]
				}
			]
		})
	})
})

describe('Implicit groups', () => {
	test('Itra-group and & or', async () => {
		const result = await parse('Notes with "foo" and "boo" or "goo"')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'or',
			clauses: [
				{
					join: 'and',
					clauses: [
						{
							type: ClauseType.With,
							text: 'foo'
						},
						{
							type: ClauseType.With,
							text: 'boo'
						}
					]
				},
				{
					type: ClauseType.With,
					text: 'goo'
				}
			]
		})
	})

	test('Inter group and & or', async () => {
		const result = await parse('Notes with "foo" and in [[boo]] or with "goo"')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'or',
			clauses: [
				{
					join: 'and',
					clauses: [
						{
							type: ClauseType.With,
							text: 'foo'
						},
						{
							type: ClauseType.In,
							reference: 'boo'
						}
					]
				},
				{
					type: ClauseType.With,
					text: 'goo'
				}
			]
		})
	})

	test('Mixed inter & intra', async () => {
		const result = await parse('Notes with "foo" or "goo" and in [[boo]]')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					join: 'or',
					clauses: [
						{
							type: ClauseType.With,
							text: 'foo'
						},
						{
							type: ClauseType.With,
							reference: 'goo'
						}
					]
				},
				{
					type: ClauseType.In,
					reference: 'boo'
				}
			]
		})
	})
})
