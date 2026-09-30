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

function render(delta: Delta) {
	const root = document.createElement('div')
	root.innerHTML = inlineToHTML(getEditor(), delta)
	return root
}

describe('renderInline: adjacent hidden-group embeds', () => {
	test('Distinct instances with the same source render as two containers', () => {
		const root = render(new Delta([
			{ insert: '$a$', attributes: { math: { source: 'a' }, hiddenGroup: '0-3' } },
			{ insert: '$a$', attributes: { math: { source: 'a' }, hiddenGroup: '3-6' } }
		]))

		const containers = root.querySelectorAll('.inline-math-container')
		expect([...containers].map(c => c.getAttribute('data-hidden-group'))).toEqual(['0-3', '3-6'])
	})

	test('Distinct furigana groups with the same content render as two containers', () => {
		const editor = getEditor()
		const delta = new Delta([
			{ insert: '{a|b}', attributes: { furigana: { base: 'a', reading: 'b' }, hiddenGroup: '0-5' } },
			{ insert: '{a|b}', attributes: { furigana: { base: 'a', reading: 'b' }, hiddenGroup: '5-10' } }
		])

		expect(render(delta).querySelectorAll('.inline-furigana-container')).toHaveLength(2)
	})

	test('Decorations splitting one furigana group do not duplicate its output', () => {
		const editor = getEditor()
		const furigana = { base: 'Mr. Smith', reading: 'ミスター・スミス' }
		const delta = new Delta([
			{
				insert: '{Mr.',
				attributes: { furigana, hiddenGroup: '0-20', decoration: { focus: { class: 'unfocused' } } }
			},
			{
				insert: ' Smith|ミスター・スミス}',
				attributes: { furigana, hiddenGroup: '0-20', decoration: { focus: { class: 'focused' } } }
			}
		])
		const root = render(delta)
		expect(root.querySelectorAll('.inline-furigana-container')).toHaveLength(1)
		expect(root.querySelectorAll('t-furigana')).toHaveLength(1)
	})
})

describe('renderInline: adjacent embeds', () => {
	test('Distinct embed instances render as distinct outputs', () => {
		const root = render(parseMarkdown('![[a.png]]![[a.png]]').lines[0].content)

		expect(root.querySelectorAll('t-embed')).toHaveLength(2)
	})

	test('Nested formatting does not split an embed instance', () => {
		const root = render(parseMarkdown('![[a.png|**x**]]').lines[0].content)

		expect(root.querySelectorAll('t-embed')).toHaveLength(1)
	})
})

describe('renderInline: adjacent links', () => {
	test('Distinct wiki-link instances with the same href render separately', () => {
		const root = render(parseMarkdown('[[a]][[a]]').lines[0].content)

		const links = root.querySelectorAll('t-link')
		expect([...links].map(l => l.getAttribute('data-hidden-group'))).toEqual(['0-5', '5-10'])
	})

	test('Nested formatting does not split a link instance', () => {
		const root = render(parseMarkdown('[[a|**x**]]').lines[0].content)

		expect(root.querySelectorAll('t-link')).toHaveLength(1)
	})

	test('Hidden group ids add no wrapper elements', () => {
		const root = render(parseMarkdown('[[a]]').lines[0].content)

		expect(root.querySelectorAll('[data-hidden-group]')).toHaveLength(1)
		expect(root.querySelector('[data-hidden-group]').tagName).toBe('T-LINK')
	})
})
