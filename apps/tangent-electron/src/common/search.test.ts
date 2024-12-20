import { describe, test, expect, it } from 'vitest'

import type { TreeNode } from './trees'
import { IndexData, StructureType } from './indexing/indexTypes'
import { buildFuzzySegementMatcher, buildMatcher, compareNodeSearch, nodeSearchResults } from './search'

describe('Match building', () => {
	it('should split characters by whitespace', () => {
		// Not matching diacritics here for readability
		expect(buildFuzzySegementMatcher('foo bar', false)).toEqual(/(foo).*(bar)/di)
	})
})

describe('Match ordering', () => {
	it('Should prefer earlier searches', () => {
		const matcher = buildMatcher('t t', { fuzzy: true })
		const source = ['Totally', 'Tonally Totalled']
		const matched = source.map(s => ({
			text: s,
			match: s.match(matcher)
		}))

		matched.sort((a, b) => compareNodeSearch(a.match, b.match))

		const sortedText = matched.map(i => i.text)

		expect(sortedText).toEqual([
			'Totally',
			'Tonally Totalled'
		])
	})

	it('Should prefer earlier searches, relative to the first directory split', () => {
		const matcher = buildMatcher('test', { fuzzy: true })
		const source = [
			'foo/test',
			'foo/some test',
			'foo/place/a test'
		]
		const matched = source.map(s => ({
			text: s,
			match: s.match(matcher)
		}))

		matched.sort((a, b) => compareNodeSearch(a.match, b.match))
		expect(matched.map(i => i.text)).toEqual([
			'foo/test',
			'foo/place/a test',
			'foo/some test'
		])
	})

	it('Should prefer searches that match more of the source', () => {
		const matcher = buildMatcher('test', { fuzzy: true })
		const source = [
			'test something',
			'test',
			'testing the other thing'
		]
		const matched = source.map(s => ({
			text: s,
			match: s.match(matcher)
		}))

		matched.sort((a, b) => compareNodeSearch(a.match, b.match))
		expect(matched.map(i => i.text)).toEqual([
			'test',
			'test something',
			'testing the other thing'
		])
	})

	it('Preference for larger matches should be relative to directory', () => {
		const matcher = buildMatcher('test', { fuzzy: true })
		const source = [
			'foo/test me',
			'foo/test this thing',
			'foo/place/test'
		]
		const matched = source.map(s => ({
			text: s,
			match: s.match(matcher)
		}))

		matched.sort((a, b) => compareNodeSearch(a.match, b.match))
		expect(matched.map(i => i.text)).toEqual([
			'foo/place/test',
			'foo/test me',
			'foo/test this thing'
		])
	})

	it('Preference for larger matches should work at the top level', () => {
		const matcher = buildMatcher('Tangent', { fuzzy: true })
		const source = [
			'Tangent',
			'Inbox/Tangent thing',
			'Archive/Tangent other thing'
		]
		const matched = source.map(s => ({
			text: s,
			match: s.match(matcher)
		}))

		matched.sort((a, b) => compareNodeSearch(a.match, b.match))
		expect(matched.map(i => i.text)).toEqual([
			'Tangent',
			'Inbox/Tangent thing',
			'Archive/Tangent other thing'
		])
	})

	it('Should set directory matches above children', () => {
		const matcher = buildMatcher('test', { fuzzy: true })
		const source = [
			'foo/test/my thing',
			'foo/test',
			'foo/test/the other thing'
		]
		const matched = source.map(s => ({
			text: s,
			match: s.match(matcher)
		}))

		matched.sort((a, b) => compareNodeSearch(a.match, b.match))
		expect(matched.map(i => i.text)).toEqual([
			'foo/test',
			'foo/test/my thing',
			'foo/test/the other thing'
		])
	})

	it('Should set the directory above a child of the same name', () => {
		const matcher = buildMatcher('Im', { fuzzy: true })
		const source = [
			'Projects/Immortals/Immortals',
			'Projects/Immortals',
			'Projects/Immortals/the other thing'
		]
		const matched = source.map(s => ({
			text: s,
			match: s.match(matcher)
		}))

		matched.sort((a, b) => compareNodeSearch(a.match, b.match))
		expect(matched.map(i => i.text)).toEqual([
			'Projects/Immortals',
			'Projects/Immortals/Immortals',
			'Projects/Immortals/the other thing'
		])
	})
})

describe('Alias Searching', () => {
	test('Alias Names', () => {
		const testNode: TreeNode = {
			path: 'Some/File I made.md',
			fileType: '.md',
			name: 'File I made',
			meta: {
				structure: [
					{
						type: StructureType.FrontMatter,
						// Fake range
						start: 0,
						end: 10,
						data: { aliases: ['I made files'] }
					}
				]
			}
		}

		expect(IndexData.findAliasPaths(testNode)).toEqual([
			'Some/I made files'
		])
	})
})

describe('Diacritics', () => {
	test('Fuzy matches hit diacritics', () => {
		let matcher = buildMatcher('Note', { fuzzy: true })
		expect(matcher.test('Noté')).toBeTruthy()
		expect(matcher.test('note')).toBeTruthy()
		expect(matcher.test('nôte')).toBeTruthy()
		expect(matcher.test('nøte')).toBeTruthy()

		matcher = buildMatcher('and', { fuzzy: true })
		expect(matcher.test('ånd')).toBeTruthy()
	})
})
