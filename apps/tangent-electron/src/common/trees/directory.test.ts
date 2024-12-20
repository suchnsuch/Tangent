import { test, expect } from 'vitest'

import { validateFileSegment, validatePath } from "./directory"

test('File name validation', () => {
	expect(validateFileSegment(null)).toEqual(false)

	expect(validateFileSegment('foo.md')).toEqual('foo.md')
	expect(validateFileSegment('questionable?.md')).toEqual('questionable.md')

	expect(validateFileSegment('prn.txt')).toEqual(false)
	expect(validateFileSegment('COM7.png')).toEqual(false)
	expect(validateFileSegment('aUX')).toEqual(false)

	expect(validateFileSegment('ending in space.md ')).toEqual('ending in space.md')
	expect(validateFileSegment('ending <in> dot.md.')).toEqual('ending in dot.md')

	expect(validateFileSegment('containing/slashes.txt')).toEqual('containing slashes.txt')
	expect(validateFileSegment('with: colons')).toEqual('with colons')

	expect(validateFileSegment('fancy???? things.jpg')).toEqual('fancy things.jpg')
	expect(validateFileSegment('On no\na newline.txt')).toEqual('On no a newline.txt')
	expect(validateFileSegment('On no\ra return.txt')).toEqual('On no a return.txt')
})

test('File path validation', () => {
	expect(validatePath(null)).toEqual(false)

	expect(validatePath('with: colons')).toEqual('with colons')
	expect(validatePath('fancy???? things.jpg')).toEqual('fancy things.jpg')

	expect(validatePath('some folder/and file.md')).toEqual('some folder/and file.md')
	expect(validatePath('/root/some folder/and file.md')).toEqual('/root/some folder/and file.md')
})
