import { describe, expect, it } from 'vitest'

import { mailTo } from './email'

describe('mailTo', () => {
	it('Should produce mailto hrefs', () => {
		expect(mailTo('me@test.com')).toEqual('mailto:me@test.com')
	})

	it('Should encode uris for body', () => {
		expect(mailTo('guy@foo.bar', {
			body: '<p>Some Test<p>'
		})).toEqual('mailto:guy@foo.bar?body=%3Cp%3ESome%20Test%3Cp%3E')
	})
})
