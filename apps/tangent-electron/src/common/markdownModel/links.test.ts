import { describe, expect, it } from 'vitest'

import { StructureType } from 'common/indexing/indexTypes'
import { createContentIdMatcher, matchMarkdownLink } from './links'

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

	it('should be able to handle nested brackets within the href', () => {
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

	// CommonMark feature https://spec.commonmark.org/0.31.2/#example-492
	it('Should handle unbalanced parentheses via angle brackets', () => {
		expect(matchMarkdownLink('[Links with unbalanced parentheses](<https://example.com/test1).html>)')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 70,
			form: 'md',
			text: 'Links with unbalanced parentheses',
			href: 'https://example.com/test1).html'
		})
	})

	it('Should handle unbalanced parentheses via angle brackets and a header', () => {
		expect(matchMarkdownLink('[Links with unbalanced parentheses](<https://example.com/test1).html#foo>)')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 74,
			form: 'md',
			text: 'Links with unbalanced parentheses',
			href: 'https://example.com/test1).html',
			content_id: 'foo'
		})
	})

	it('Should handle paired brackets within the text', () => {
		expect(matchMarkdownLink('My [md [link]](with/an/href)')).toEqual({
			type: StructureType.Link,
			start: 3,
			end: 28,
			form: 'md',
			text: 'md [link]',
			href: 'with/an/href'
		})
	})

	it('Should ignore escaped brackets within the text', () => {
		expect(matchMarkdownLink('My [md \\[link\\]](with/an/href)')).toEqual({
			type: StructureType.Link,
			start: 3,
			end: 30,
			form: 'md',
			text: 'md \\[link\\]',
			href: 'with/an/href'
		})
	})

	it('Parses headers to content_id', () => {
		expect(matchMarkdownLink('[text](link#header)')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 19,
			form: 'md',
			text: 'text',
			href: 'link',
			content_id: 'header'
		})
	})

	it('Parses empty headers', () => {
		expect(matchMarkdownLink('[text](link#)')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 13,
			form: 'md',
			text: 'text',
			href: 'link',
			content_id: ''
		})
	})

	it('Can extract custom title text', () => {
		expect(matchMarkdownLink('foo [text](link "Title") boo')).toEqual({
			type: StructureType.Link,
			start: 4,
			end: 24,
			form: 'md',
			text: 'text',
			href: 'link',
			title: 'Title'
		})
	})

	it('Supports multi-word titles with escapes', () => {
		expect(matchMarkdownLink('foo [text](link "Title of \\"Doom\\"") boo')).toEqual({
			type: StructureType.Link,
			start: 4,
			end: 36,
			form: 'md',
			text: 'text',
			href: 'link',
			title: 'Title of "Doom"'
		})
	})

	it('Works for empty text', () => {
		expect(matchMarkdownLink('foo [](http://foo.com)')).toEqual({
			type: StructureType.Link,
			start: 4,
			end: 22,
			form: 'md',
			href: 'http://foo.com',
		})
	})
})

describe('Content ID Matching', () => {
	it('Can use varying header id forms to match header text', () => {
		expect('My Header'.match(createContentIdMatcher('My Header'))).toBeTruthy()
		expect('My Header'.match(createContentIdMatcher('my header'))).toBeTruthy()
		expect('My Header'.match(createContentIdMatcher('my-header'))).toBeTruthy()
		expect('My Header'.match(createContentIdMatcher('my_header'))).toBeTruthy()
		expect('My Header'.match(createContentIdMatcher('my%20header'))).toBeTruthy()

		expect('My Long Header'.match(createContentIdMatcher('my-long_header'))).toBeTruthy()
	})

	it('Only hits entire names', () => {
		expect('My Header'.match(createContentIdMatcher('My'))).toBeFalsy()
		expect('My'.match(createContentIdMatcher('My-header'))).toBeFalsy()
	})
})
