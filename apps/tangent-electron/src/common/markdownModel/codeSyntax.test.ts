import { test, expect } from 'vitest'
import { getLanguage } from 'common/markdownModel/codeSyntax'

/**
 * Outside a browser, `codeSyntax` needs prism's engine handed to it. If that
 * wiring breaks, code blocks quietly stop resolving their language rather than
 * failing loudly, so it is worth checking directly.
 */
test('Languages resolve without a document', () => {
	expect(getLanguage('js')).toEqual('javascript')
	expect(getLanguage('javascript')).toEqual('javascript')
	expect(getLanguage('not-a-language')).toBeFalsy()
})
