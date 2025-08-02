import { beforeAll, describe, test, expect } from 'vitest'
import { ClauseType, parseQueryText } from '../src'
import { install } from './test-loader'

beforeAll(async () => {
	await install()
})

describe('Parsing Essentials', () => {

	test('Notes with text content', async () => {
		const result = await parseQueryText('Notes with "my text"')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					text: 'my text'
				}
			]
		})
	})

	test('Notes with multiple clauses', async () => {
		const andResult = await parseQueryText('Notes with "my text" and "something"')
		expect(andResult.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					text: 'my text'
				},
				{
					type: ClauseType.With,
					text: 'something'
				}
			]
		})

		const orResult = await parseQueryText('Notes with "my text" or "something"')
		expect(orResult.query).toEqual({
			forms: ['Notes'],
			join: 'or',
			clauses: [
				{
					type: ClauseType.With,
					text: 'my text'
				},
				{
					type: ClauseType.With,
					text: 'something'
				}
			]
		})
	})
})

describe('Errors', () => {
	test('Random garbage', async () => {
		const result = await parseQueryText('zip zap zoopy')
	})
})