import { describe, expect, it } from 'vitest'

import { StructureType } from 'common/indexing/indexTypes'
import { matchMarkdownLink } from './links'

describe('Markdown Links', () => {
	it('should work for basics', () => {
		expect(matchMarkdownLink('[text](link)')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 12,
			form: 'md',
			text: 'text',
			href: 'link'
		})
	})
	
	it('should work in the middle of a string', () => {
		expect(matchMarkdownLink('foo [text](link) boo')).toEqual({
			type: StructureType.Link,
			start: 4,
			end: 16,
			form: 'md',
			text: 'text',
			href: 'link'
		})
	})

	it('should be able to handle nested brackets', () => {
		expect(matchMarkdownLink('[text](link())')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 14,
			form: 'md',
			text: 'text',
			href: 'link()'
		})

		expect(matchMarkdownLink('[text](link()thing)')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 19,
			form: 'md',
			text: 'text',
			href: 'link()thing'
		})

		expect(matchMarkdownLink('[text](link()thing[])')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 21,
			form: 'md',
			text: 'text',
			href: 'link()thing[]'
		})

		expect(matchMarkdownLink('My [md link](link(with)[brackets])')).toEqual({
			type: StructureType.Link,
			start: 3,
			end: 34,
			form: 'md',
			text: 'md link',
			href: 'link(with)[brackets]'
		})
	})
})
