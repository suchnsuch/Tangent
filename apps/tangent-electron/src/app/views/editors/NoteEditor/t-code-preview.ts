import katex from 'katex';
import 'katex/dist/katex.min.css';

import { renderAsync } from 'pele/lazy'
import { requestCallbackOnIdle } from '@such-n-such/core'
import { defineCustomElement } from 'app/utils/defineCustomElement'

import { computeBoundingBox, createStyleElement } from './utils'

let nextIdValue = 0

class TangentCodePreview extends HTMLElement {
	private content: HTMLElement
	private isPendingUpdate = false
	private renderToken = 0

	constructor() {
		super()

		const shadow = this.attachShadow({ mode: 'open' })
		const content = document.createElement('div')
		content.style.textAlign = 'center'
		content.style.whiteSpace = 'normal'
		shadow.appendChild(createStyleElement('./pele.css'))
		shadow.appendChild(content)
		this.content = content
	}

	static get observedAttributes() {
		return ['language', 'source']
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (name === 'language' || name === 'source') {
			this.debouncedUpdatePreview()
		}
	}

	connectedCallback() {
		if (this.isConnected) {
			this.content.innerHTML = '<span style="color: var(--deemphasizedTextColor);">loading…</span>'
			this.debouncedUpdatePreview()
		}
	}

	debouncedUpdatePreview() {
		if (!this.isPendingUpdate) {
			this.isPendingUpdate = true
			requestCallbackOnIdle(() => {
				this.updatePreview()
				this.isPendingUpdate = false
			}, 150)
		}
	}


	async updatePreview() {
		const language = this.getAttribute('language')
		const source = this.getAttribute('source')

		// Loading mermaid widens the window in which this element can be asked
		// to render something else, so only the most recent call may write.
		const token = ++this.renderToken

		if (language !== 'mermaid') {
			this.content.innerHTML = ''
			return
		}

		const math = (tex: string) => {
			const html = katex.renderToString(tex, {
				throwOnError: false,
				displayMode: false,
				output:'mathml'
			})
			
			return { 
				html, // the rendered math
				...computeBoundingBox(html, this.content) // Pele needs to know the pixel dimensions measure once with a temporary element
			}
		}

		try {
			nextIdValue++
			
			if (token !== this.renderToken) return
			const { svg } = await renderAsync(source, {math, idPrefix: `pele-${nextIdValue}`})
			this.content.innerHTML = svg
		}
		catch (error) {
			if (token !== this.renderToken) return
			this.content.innerHTML = `<div>Invalid Mermaid Source</div>
				<div style="color: red; white-space: pre-wrap; text-align: left; font-family: var(--codeFontFamily); font-size: 80%;">${error}</div>`
		}
	}
}

defineCustomElement('t-code-preview', TangentCodePreview)
export default TangentCodePreview