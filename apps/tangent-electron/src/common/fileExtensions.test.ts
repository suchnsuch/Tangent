import { describe, expect, it } from 'vitest'

import { getFileTypeRegex } from './fileExtensions'

describe('File Extension Utils', () => {
	it('Should always line up with the end', () => {
		const mdMatch = getFileTypeRegex(['.md', 'folder'])
		expect('.mdx'.match(mdMatch)).toBeNull()
	})
	it('Should always line up with the end', () => {
		const mdMatch = getFileTypeRegex(['.md', '.txt'])
		expect('.mdx'.match(mdMatch)).toBeNull()
		expect('.md'.match(mdMatch)).not.toBeNull()
	})
	it('Should not match anything when given a blank list', () => {
		const match = getFileTypeRegex([])
		expect('.md'.match(match)).toBeNull()
		expect('.jpg'.match(match)).toBeNull()
		expect('foo'.match(match)).toBeNull()
		expect('folder'.match(match)).toBeNull()
	})
})
