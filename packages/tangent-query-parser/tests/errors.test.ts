import { beforeAll, describe, test, expect } from 'vitest'
import { ClauseType, parseQueryText, QueryError } from '../src'
import { install } from './test-loader'

beforeAll(async () => {
	await install()
})

describe('Clause errors', () => {
	test('Empty text', async () => {
		const result = await parseQueryText('Notes with ""')
		expect(result.query).toBeUndefined()
		expect(result.errors).toContainEqual<QueryError>({
			start: 11,
			end: 13,
			message: 'An empy value matches everything and is invalid.'
		})
	})
})

describe('Value errors', () => {
	test('Unclosed tokenized text', async () => {
		const result = await parseQueryText(`Notes with '`)
		expect(result.query).toBeUndefined()
		expect(result.errors).toContainEqual<QueryError>({
			start: 11, end: 12,
			message: 'Value was not closed. Expected a `\'` to end the value.'
		})
	})

	test('Unclosed wiki link', async () => {
		const result = await parseQueryText(`Notes with [[My thing`)
		expect(result.query).toBeUndefined()
		expect(result.errors).toContainEqual<QueryError>({
			start: 11, end: 21,
			message: 'Value "My thing" was not closed. Expected a `]]` to end the value.'
		})
	})
})