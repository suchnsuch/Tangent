import { describe, it, expect } from 'vitest'

import './t-furigana'

describe('t-furigana', () => {
	it('renders base and reading as ruby/rt inside its shadow root', () => {
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

	it('updates shadow content when attributes change', () => {
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

	it.each(['click', 'dblclick', 'mousedown', 'contextmenu'])('%s requests selection matching only this span\'s inline id', eventType => {
		const group = document.createElement('span')
		group.setAttribute('data-hidden-group', '0-12')
		const el = document.createElement('t-furigana')
		el.setAttribute('base', '漢字')
		el.setAttribute('reading', 'かんじ')
		group.appendChild(el)
		document.body.appendChild(group)

		let captured: any
		el.addEventListener(eventType, event => {
			captured = (event as any).editorSelectionRequest
		})
		el.dispatchEvent(new MouseEvent(eventType, { bubbles: true }))

		expect(captured.inline({ hiddenGroup: '0-12' })).toBe(true)
		expect(captured.inline({ hiddenGroup: '12-24' })).toBe(false)

		group.remove()
	})
})
