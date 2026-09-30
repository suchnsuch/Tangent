import { describe, test, expect } from 'vitest'

import { Editor, inlineToHTML } from 'typewriter-editor'
import { Delta } from '@typewriter/delta'
import noteTypeset from 'common/markdownModel/typewriterTypes'
import { parseMarkdown } from 'common/markdownModel/parser'

function getEditor() {
	const editor = new Editor({ types: noteTypeset })
	editor.setRoot(document.createElement('div'))
	return editor
}

function containerCount(html: string) {
	return (html.match(/inline-math-container/g) ?? []).length
}

describe('renderInline: adjacent inline math', () => {
	test('Distinct instances with the same source render as two containers', () => {
		const editor = getEditor()
		const delta = new Delta([
			{ insert: '$a$', attributes: { math: { source: 'a' }, hiddenGroup: '0-3' } },
			{ insert: '$a$', attributes: { math: { source: 'a' }, hiddenGroup: '3-6' } }
		])

		const html = inlineToHTML(editor, delta)
		expect(containerCount(html)).toBe(2)
		expect(html).toContain('data-hidden-group="0-3"')
		expect(html).toContain('data-hidden-group="3-6"')
	})
})

describe('renderInline: adjacent embeds', () => {
	test('Distinct embed instances render as distinct outputs', () => {
		const editor = getEditor()
		const delta = parseMarkdown('![[a.png]]![[b.png]]').lines[0].content
		const html = inlineToHTML(editor, delta)

		expect(html.match(/<t-embed/g)).toHaveLength(2)
	})
})
