import { describe, expect, it } from 'vitest'

import { StructureType } from 'common/indexing/indexTypes'
import { createContentIdMatcher, matchMarkdownLink, matchWikiLink } from './links'

describe('Wiki Links', () => {
	it('Should work for the basics', () => {
		expect(matchWikiLink('[[File Name]]')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 13,
			form: 'wiki',
			href: 'File Name'
		})
	})

	it('Should allow for custom text', () => {
		expect(matchWikiLink('[[File Name|my text]]')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 21,
			form: 'wiki',
			href: 'File Name',
			text: 'my text'
		})
	})

	it('Should allow for header links', () => {
		expect(matchWikiLink('[[File Name#My Header]]')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 23,
			form: 'wiki',
			href: 'File Name',
			content_id: 'My Header'
		})
	})

	it('Should allow for header links all alone', () => {
		expect(matchWikiLink('[[#My Header]]')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 14,
			form: 'wiki',
			href: '',
			content_id: 'My Header'
		})
	})

	it('Should allow for header and custom text', () => {
		expect(matchWikiLink('[[File Name#My Header|my text]]')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 31,
			form: 'wiki',
			href: 'File Name',
			content_id: 'My Header',
			text: 'my text'
		})
	})

	it('Should optionally include format characters', () => {
		expect(matchWikiLink('[[File Name#My Header|my text]]', 0, {
			snipFormatCharacters: false
		})).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 31,
			form: 'wiki',
			href: 'File Name',
			content_id: '#My Header',
			text: '|my text'
		})
	})



	it('Can match names with nested brackets', () => {
		expect(matchWikiLink('[[[Bracket] Name]]')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 18,
			form: 'wiki',
			href: '[Bracket] Name'
		})
	})

	it('Should not find an unclosed link', () => {
		expect(matchWikiLink('My [[Dead Link', )).toBeNull()
		expect(matchWikiLink('My [[Dead Link]', )).toBeNull()
	})

	it('Can find links later in the string', () => {
		expect(matchWikiLink('Here is a [[File Name]]')).toEqual({
			type: StructureType.Link,
			start: 10,
			end: 23,
			form: 'wiki',
			href: 'File Name'
		})
	})

	it('Offsets the reported index by the provided value', () => {
		expect(matchWikiLink('Here is a [[File Name]]', 10)).toEqual({
			type: StructureType.Link,
			start: 20,
			end: 33,
			form: 'wiki',
			href: 'File Name'
		})
	})

	it('Does not get confused by links later in the string', () => {
		expect(matchWikiLink('[[One Link]] and [[Two Link]]')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 12,
			form: 'wiki',
			href: 'One Link'
		})
	})

	it('Does not get confused by link text later in the string', () => {
		expect(matchWikiLink('[[One Link]] and [[Two Link|stuff]]')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 12,
			form: 'wiki',
			href: 'One Link'
		})
	})

	it('Does not get confused by link content ids later in the string', () => {
		expect(matchWikiLink('[[One Link]] and [[Two Link#Header]]')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 12,
			form: 'wiki',
			href: 'One Link'
		})
	})

	it('Does not get confused by pipes later in the string', () => {
		expect(matchWikiLink('[[One Link]] and a|pipe')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 12,
			form: 'wiki',
			href: 'One Link'
		})
	})

	it('Does not get confused by hashes later in the string', () => {
		expect(matchWikiLink('[[One Link]] and a #tag')).toEqual({
			type: StructureType.Link,
			start: 0,
			end: 12,
			form: 'wiki',
			href: 'One Link'
		})
	})

	it('Should not match over newlines', () => {
		expect(matchWikiLink('Here is a [[File\nName]]', 10)).toBeNull()
	})

	describe('Incomplete Wiki Links', () => {
		const options = {
			allowIncomplete: true
		}

		it('Should find opening brackets and text', () => {
			expect(matchWikiLink('[[Unclosed Link', 0, options)).toEqual({
				type: StructureType.Link,
				start: 0,
				end: 15,
				form: 'wiki',
				href: 'Unclosed Link'
			})
		})

		it('Does not include trailing newlines', () => {
			expect(matchWikiLink('[[Unclosed link\nof doom', 0, options)).toEqual({
				type: StructureType.Link,
				start: 0,
				end: 15,
				form: 'wiki',
				href: 'Unclosed link'
			})
		})
	})
})

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
