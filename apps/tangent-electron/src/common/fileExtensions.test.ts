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
})
