import { describe, test, expect } from 'vitest'

import './t-furigana'

describe('t-furigana', () => {
	test('renders base and reading as ruby/rt inside its shadow root', () => {
		const el = document.createElement('t-furigana')
		el.setAttribute('base', '漢字')
		el.setAttribute('reading', 'かんじ')
		document.body.appendChild(el)

		const ruby = el.shadowRoot.querySelector('ruby')
		const rt = el.shadowRoot.querySelector('rt')

		expect(ruby.firstChild.textContent).toBe('漢字')
		expect(rt.textContent).toBe('かんじ')

		el.remove()
	})

	test('updates shadow content when attributes change', () => {
		const el = document.createElement('t-furigana')
		el.setAttribute('base', '字')
		el.setAttribute('reading', 'じ')
		document.body.appendChild(el)

		el.setAttribute('base', '語')
		el.setAttribute('reading', 'ご')

		const ruby = el.shadowRoot.querySelector('ruby')
		const rt = el.shadowRoot.querySelector('rt')

		expect(ruby.firstChild.textContent).toBe('語')
		expect(rt.textContent).toBe('ご')

		el.remove()
	})

	test('click requests selection matching only this span\'s instance', () => {
		const el = document.createElement('t-furigana')
		el.setAttribute('base', '漢字')
		el.setAttribute('reading', 'かんじ')
		el.setAttribute('instance', '0-12')
		document.body.appendChild(el)

		let captured: any
		el.addEventListener('click', event => {
			captured = (event as any).editorSelectionRequest
		})
		el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(captured.inline({ furigana: { base: '漢字', reading: 'かんじ', instance: '0-12' } })).toBe(true)
		expect(captured.inline({ furigana: { base: '漢字', reading: 'かんじ', instance: '12-24' } })).toBe(false)

		el.remove()
	})
})
