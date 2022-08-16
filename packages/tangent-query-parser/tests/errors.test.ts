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