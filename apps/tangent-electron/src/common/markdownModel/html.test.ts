import { describe, it, expect } from 'vitest'

import * as parser from './parser'
import { buildOpsFromInsertList } from 'common/typewriterUtils'

const PUNCTUATION_ATTRIBUTES = {
	inline_code: 'html',
	code_syntax: 'punctuation'
}
const TAG_ATTRIBUTES = {
	inline_code: 'html',
	code_syntax: 'tag'
}

describe('Full parsing', () => {
	it('Should parse single inline elements', () => {
		const doc = parser.markdownToTextDocument(`This is my <a>Test</a> of html`)
		expect(doc.lines.length).toEqual(1)

		const line = doc.lines[0]
		expect(line.attributes.html).toBeTruthy()

		expect(line.content.ops).toEqual(buildOpsFromInsertList([
			'This is my ',
			'<', PUNCTUATION_ATTRIBUTES,
			'a', TAG_ATTRIBUTES,
			'>', PUNCTUATION_ATTRIBUTES,
			'Test', {
				inline_code: 'html'
			},
			'</', PUNCTUATION_ATTRIBUTES,
			'a', TAG_ATTRIBUTES,
			'>', PUNCTUATION_ATTRIBUTES,
			' of html'
		], true))
	})

	it('Should parse multi-line html', () => {
		const doc = parser.markdownToTextDocument(`I have some stuff here
It has <span>Some <strong>integrated</strong> html
that continues across <em>multiple</em> lines.
</span>. Pretty cool!
I think so.`)

		expect(doc.lines.length).toEqual(5)

		expect(doc.lines[0].attributes.html).toBeFalsy()
		expect(doc.lines[1].attributes.html).toBeTruthy()
		expect(doc.lines[2].attributes.html).toBeTruthy()
		expect(doc.lines[3].attributes.html).toBeTruthy()
		expect(doc.lines[4].attributes.html).toBeFalsy()

		expect(doc.lines[3].content.ops).toEqual(buildOpsFromInsertList([
			'</', PUNCTUATION_ATTRIBUTES,
			'span', TAG_ATTRIBUTES,
			'>', PUNCTUATION_ATTRIBUTES,
			'. Pretty cool!'
		], true))
	})
})
