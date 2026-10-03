import { describe, test, expect } from 'vitest'

import { getFileUrl, getFilePathFromUrl, FILE_PROTOCOL_PREFIX } from 'common/fileUrl'

function ensureRoundTrips(filepath: string, expectedPath = filepath) {
	expect(getFilePathFromUrl(getFileUrl(filepath))).toEqual(expectedPath)
}

describe('getFileUrl()', () => {
	test('Converts a posix path', () => {
		expect(getFileUrl('/Users/me/Vault/note.png'))
			.toEqual(FILE_PROTOCOL_PREFIX + '/Users/me/Vault/note.png')
	})

	test('Converts a windows path, preserving the drive', () => {
		expect(getFileUrl('C:\\Users\\me\\Vault\\note.png'))
			.toEqual(FILE_PROTOCOL_PREFIX + '/C:/Users/me/Vault/note.png')
	})

	test('Escapes characters that would otherwise break the url', () => {
		expect(getFileUrl('/Users/me/a #1 note.png'))
			.toEqual(FILE_PROTOCOL_PREFIX + '/Users/me/a%20%231%20note.png')
		expect(getFileUrl('/Users/me/100%.png'))
			.toEqual(FILE_PROTOCOL_PREFIX + '/Users/me/100%25.png')
		expect(getFileUrl('/Users/me/what?.png'))
			.toEqual(FILE_PROTOCOL_PREFIX + '/Users/me/what%3F.png')
	})

	test('Appends a cache busting value', () => {
		expect(getFileUrl('/Users/me/note.png', 1234))
			.toEqual(FILE_PROTOCOL_PREFIX + '/Users/me/note.png?t=1234')
	})

	test('Converts dates to their timestamp', () => {
		const date = new Date(1234)
		expect(getFileUrl('/Users/me/note.png', date))
			.toEqual(FILE_PROTOCOL_PREFIX + '/Users/me/note.png?t=1234')
	})

	test('Omits the query when there is nothing to bust with', () => {
		expect(getFileUrl('/Users/me/note.png')).not.toContain('?')
		expect(getFileUrl('/Users/me/note.png', undefined)).not.toContain('?')
		expect(getFileUrl('/Users/me/note.png', null)).not.toContain('?')
	})

	test('Passes through empty paths', () => {
		expect(getFileUrl('')).toEqual('')
		expect(getFileUrl(null)).toEqual('')
	})
})

describe('getFilePathFromUrl()', () => {
	test('Rejects urls from other protocols', () => {
		expect(() => getFilePathFromUrl('file:///Users/me/note.png')).toThrow()
		expect(() => getFilePathFromUrl('https://example.com/note.png')).toThrow()
	})

	test('Ignores the cache busting query', () => {
		expect(getFilePathFromUrl(getFileUrl('/Users/me/note.png', 1234)))
			.toEqual('/Users/me/note.png')
	})
})

describe('round trips', () => {
	test('Posix paths', () => {
		ensureRoundTrips('/Users/me/Vault/note.png')
		ensureRoundTrips('/Users/me/Vault/a folder/note.png')
	})

	test('Windows paths', () => {
		ensureRoundTrips('C:\\Users\\me\\Vault\\note.png')
		ensureRoundTrips('c:\\Users\\me\\a #1 note.png')
		ensureRoundTrips('C:\\Users\\me\\100%.png')
		ensureRoundTrips('D:/Users/me/note.png', 'D:\\Users\\me\\note.png')
	})

	test('Windows network paths', () => {
		ensureRoundTrips('\\\\server\\share\\note.png')
	})

	test('Awkward file names', () => {
		ensureRoundTrips('/Users/me/a #1 note.png')
		ensureRoundTrips('/Users/me/100%.png')
		ensureRoundTrips('/Users/me/what?.png')
		ensureRoundTrips('/Users/me/50% + 50%.png')
		ensureRoundTrips('/Users/me/notes & things.png')
	})

	test('Non-ascii file names', () => {
		ensureRoundTrips('/Users/me/Ideas/日本語.png')
		ensureRoundTrips('/Users/me/Ideas/café.png')
		ensureRoundTrips('/Users/me/Ideas/🎉.png')
	})
})
