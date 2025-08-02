import { beforeAll, describe, test, expect } from 'vitest'
import { parseQueryText, ClauseType, TodoQueryState } from '../src'
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
					todo: TodoQueryState.Any
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
					todo: TodoQueryState.Open
				}
			]
		})
	})

	test('Notes with finished todos', async () => {
		const result = await parseQueryText('Notes with finished todos')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					todo: TodoQueryState.Complete
				}
			]
		})
	})

	test('Notes with canceled todos', async () => {
		const result = await parseQueryText('Notes with canceled todos')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					todo: TodoQueryState.Canceled
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
					todo: TodoQueryState.Closed
				}
			]
		})
	})
})