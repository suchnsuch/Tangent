import { beforeAll, describe, it, expect } from 'vitest'
import { ClauseType, parseQueryText } from '../src'
import { install } from './test-loader'

beforeAll(async () => {
	await install()
})

describe('Simple Clauses', () => {

	it('Builds single text clauses', async () => {
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
})

describe('Multiple Clauses', () => {
	it('Combines ands of the same type', async () => {
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
	})
	
	it('Combines ors of the same type', async () => {
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

	it('Combines ands of different types', async () => {
		const orResult = await parseQueryText('Notes with "my text" or [[Something]]')
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
					reference: 'Something'
				}
			]
		})
	})
})

describe('Errors', () => {
	it('Error on Random garbage', async () => {
		const result = await parseQueryText('zip zap zoopy')
	})
})