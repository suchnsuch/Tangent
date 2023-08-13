import { ClauseGroupMod, ClauseType, parseQueryText } from '../src'
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

describe('Negated groups', () => {
	test('Not should negate the next statement', async () => {
		const result = await parseQueryText('Notes not with "my text"')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					mod: ClauseGroupMod.Not,
					join: 'and',
					clauses: [{
						type: ClauseType.With,
						text: 'my text'
					}]
				}
			]
		})
	})

	test('Not should grab clauses that share the same clause prefix', async () => {
		const result = await parseQueryText('Notes not with "my text" or "foo"')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					mod: ClauseGroupMod.Not,
					join: 'or',
					clauses: [
						{
							type: ClauseType.With,
							text: 'my text'
						},
						{
							type: ClauseType.With,
							text: 'foo'
						}
					]
				}
			]
		})
	})

	test('Not should be dropped when the clause prefix is included', async () => {
		const result = await parseQueryText('Notes not with "my text" or with "foo"')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'or',
			clauses: [
				{
					mod: ClauseGroupMod.Not,
					join: 'and',
					clauses: [{
						type: ClauseType.With,
						text: 'my text'
					}]
				},
				{
					type: ClauseType.With,
					text: 'foo'
				}
			]
		})
	})

	test('Not should capture a defined group', async () => {
		const result = await parseQueryText('Notes not (with "my text" or named "foo")')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					mod: ClauseGroupMod.Not,
					join: 'or',
					clauses: [
						{
							type: ClauseType.With,
							text: 'my text'
						},
						{
							type: ClauseType.Named,
							text: 'foo'
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
