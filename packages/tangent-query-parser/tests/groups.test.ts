import { ClauseType, parseQueryText } from '../src'
import { install } from './test-loader'

beforeAll(async () => {
	await install()
})

describe('Explicit Groups', () => {
	test('Trailing intra-clause Group', async () => {
		const result = await parseQueryText('Notes with "my text" and ("this" or "that")')
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
		const result = await parseQueryText('Notes with ("this" or "that") and "my text"')
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
		const result = await parseQueryText('Notes with "my text" and (in [[place]] or linked from [[location]])')
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
		const result = await parseQueryText('Notes with "my text" and ((in [[place]] or [[folder]]) and linked from [[location]])')
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

// TODO: Make these tests pass
// These tests are marked as failing so that they are ready to go when I actually want to implement this
describe('Implicit groups', () => {
	test.failing('Itra-group and & or', async () => {
		const result = await parseQueryText('Notes with "foo" and "boo" or "goo"')
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

	test.failing('Inter group and & or', async () => {
		const result = await parseQueryText('Notes with "foo" and in [[boo]] or with "goo"')
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

	test.failing('Mixed inter & intra', async () => {
		const result = await parseQueryText('Notes with "foo" or "goo" and in [[boo]]')
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
