import { describe, expect, it } from 'vitest'

import { isExternalLink } from './links'

describe('isExternalLink', () => {
	it('Should match a normal url', () => {
		expect(isExternalLink('http://google.com')).toBe(true)
		expect(isExternalLink('https://www.apple.com')).toBe(true)
		expect(isExternalLink('ftp://place.it/location')).toBe(true)
	})

	it('Should not match a relative path', () => {
		expect(isExternalLink('../../My relative path')).toBe(false)
		expect(isExternalLink('./My relative path')).toBe(false)
	})

	it('Should not match a root path', () => {
		expect(isExternalLink('/My root path')).toBe(false)
	})
})
