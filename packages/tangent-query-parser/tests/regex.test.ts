import { beforeAll, describe, test, expect } from 'vitest'
import { ClauseType, parseQueryText } from '../src'
import { install } from './test-loader'

beforeAll(async () => {
	await install()
})

describe('Regex basics', () => {

	test('Notes with regex match', async () => {
		const result = await parseQueryText('Notes with /my text/')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					regex: /my text/d
				}
			]
		})
	})

	test('Notes with regex with arguments', async () => {
		const result = await parseQueryText('Notes with /my text/g')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					regex: /my text/gd
				}
			]
		})
	})
})