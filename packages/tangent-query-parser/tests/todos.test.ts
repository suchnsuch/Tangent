import { parseQueryText, ClauseType, TodoState } from '../src'
import { install } from './test-loader'

beforeAll(async () => {
	await install()
})

describe('Tag Parsing', () => {
	test('Notes with any todo', async () => {
		const result = await parseQueryText('Notes with todos')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					todo: TodoState.Any
				}
			]
		})
	})

	test('Notes with open todos', async () => {
		const result = await parseQueryText('Notes with open todos')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					todo: TodoState.Open
				}
			]
		})
	})

	test('Notes with closed todos', async () => {
		const result = await parseQueryText('Notes with closed todos')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					todo: TodoState.Closed
				}
			]
		})
	})
})