import { ClauseMod, ClauseType, parseQueryText, Query } from '../src'
import { install } from './test-loader'

beforeAll(async () => {
	await install()
})

describe('Explicit subquery', () => {
	test('Simple subquery forwarding', async () => {
		const result = await parseQueryText('Notes in { Notes with "Test" }')
		expect(result.query).toEqual<Query>({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.In,
					query: {
						forms: ['Notes'],
						join: 'and',
						clauses: [
							{
								type: ClauseType.With,
								text: "Test"
							}
						]
					}
				}
			]
		})
	})

	test('Multiple subqueries', async () => {
		const result = await parseQueryText('Notes in any { Folders named "Test" } or { Folders named "Foo" }')
		expect(result.query).toEqual<Query>({
			forms: ['Notes'],
			join: 'or',
			clauses: [
				{
					type: ClauseType.In,
					mod: ClauseMod.Any,
					query: {
						forms: ['Folders'],
						join: 'and',
						clauses: [
							{
								type: ClauseType.Named,
								text: "Test"
							}
						]
					}
				},
				{
					type: ClauseType.In,
					mod: ClauseMod.Any,
					query: {
						forms: ['Folders'],
						join: 'and',
						clauses: [
							{
								type: ClauseType.Named,
								text: "Foo"
							}
						]
					}
				}
			]
		})
	})
})
