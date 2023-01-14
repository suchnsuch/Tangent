import { parseQueryText, ClauseType } from '../src'
import { tokenizeTagName } from '../src/tags'
import { install } from './test-loader'

beforeAll(async () => {
	await install()
})

describe('Tag Tokenization', () => {
	it('Should split names on slashes', () => {
		expect(tokenizeTagName('parent/child')).toEqual([
			'parent', 'child'
		])
	})
	it('Should split names on periods', () => {
		expect(tokenizeTagName('parent.child')).toEqual([
			'parent', 'child'
		])
	})
	it('Should give single-item arrays with no seperators', () => {
		expect(tokenizeTagName('parent')).toEqual(['parent'])
	})
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
					tag: { names: ['my-tag'] }
				}
			]
		})
	})

	test('Notes with child tags', async () => {
		const result = await parseQueryText('Notes with #parent/child')
		expect(result.query).toEqual({
			forms: ['Notes'],
			join: 'and',
			clauses: [
				{
					type: ClauseType.With,
					tag: { names: ['parent', 'child'] }
				}
			]
		})
	})
})