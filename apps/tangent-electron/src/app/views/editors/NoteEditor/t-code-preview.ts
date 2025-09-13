import { requestCallbackOnIdle } from '@such-n-such/core'
import mermaid from 'mermaid'

let nextIdValue = 0

class TangentCodePreview extends HTMLElement {
	private content: HTMLElement
	private isPendingUpdate = false

	constructor() {
		super()

		const shadow = this.attachShadow({ mode: 'open' })
		const content = document.createElement('div')
		content.style.textAlign = 'center'
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
		console.log('Constructor!')
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

	updatePreview() {
		const language = this.getAttribute('language')
		const source = this.getAttribute('source')

		console.log('Updating code preview', {
			language, source
		})

		if (language === 'mermaid') {
			mermaid.render('mermaid-diagram-' + nextIdValue++, source).then(result => {
				this.content.innerHTML = result.svg
			})
			.catch(error => {
				console.error('Mermaid failed to render: ', error)
				this.content.innerHTML = ''
			})
		}
		else {
			this.content.innerHTML = ''
		}
	}
}

customElements.define('t-code-preview', TangentCodePreview)
export default TangentCodePreview