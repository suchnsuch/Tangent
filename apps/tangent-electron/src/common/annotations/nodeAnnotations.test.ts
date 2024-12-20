import { describe, test, expect, it } from 'vitest'

import { applyAnnotation, ChildList, childrenToHTML } from './nodeAnnotations'

describe('annotateWithNode()', () => {
	it('Should split text appropriately', () => {
		const text = ['This is a test']
		const result = applyAnnotation(text, {
			className: 'test'
		}, [5, 7])
		expect(result).toEqual<ChildList>([
			'This ',
			{
				annotation: { className: 'test' },
				children: [ 'is' ]
			},
			' a test'
		])
	})

	it('Should split accross nodes', () => {
		const input: ChildList = [
			{
				annotation: { className: 'test' },
				children: ['This is']
			},
			' ',
			{
				annotation: { className: 'test' },
				children: ['a test']
			}
		]
		const result = applyAnnotation(input, {
			className: 'split'
		}, [5, 9])
		expect(result).toEqual<ChildList>([
			{
				annotation: { className: 'test' },
				children: [
					'This ',
					{
						annotation: { className: 'split' },
						children: ['is']
					}
				]
			},
			{
				annotation: { className: 'split' },
				children: [' ']
			},
			{
				annotation: { className: 'test' },
				children: [
					{
						annotation: { className: 'split' },
						children: ['a']
					},
					' test'
				]
			}
		])
	})
})

describe('childrenToHTML()', () => {
	test('Raw strings are raw strings', () => {
		expect(childrenToHTML(['Test'])).toEqual('Test')
	})

	test('Classnames become css classes', () => {
		expect(childrenToHTML([
			{
				annotation: { className: 'test' },
				children: ['my test']
			}
		])).toEqual('<span class="test">my test</span>')
	})
})
