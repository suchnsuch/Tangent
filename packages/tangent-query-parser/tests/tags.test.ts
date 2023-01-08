import { parseQueryText, ClauseType } from '../src'
import { install } from './test-loader'

beforeAll(async () => {
	await install()
})

describe('Tag Parsing', () => {
	test('Notes with tags', async () => {
		const result = await parseQueryText('Notes with #my-tag')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					tag: { name: 'my-tag' }
				}
			]
		})
	})
})