import { requestCallbackOnIdle } from '@such-n-such/core'
import { markAsSelectionRequest } from 'app/events'
import katex from 'katex'

class TangentMath extends HTMLElement {
	
	private content: HTMLElement

	constructor() {
		super()

		this.addEventListener('click', this.onClick)
		this.addEventListener('dblclick', this.onClick)
		this.addEventListener('mousedown', this.onClick)
		this.addEventListener('contextmenu', this.onClick)

		const shadow = this.attachShadow({ mode: 'open' })

		const katexStyles = document.createElement('link')
		katexStyles.setAttribute('rel', 'stylesheet')
		katexStyles.setAttribute('href', '../__build/bundle/katex.min.css')
		shadow.appendChild(katexStyles)

		const localStyles = document.createElement('link')
		localStyles.setAttribute('rel', 'stylesheet')
		localStyles.setAttribute('href', './math.css')
		shadow.appendChild(localStyles)

		const content = document.createElement('span')
		shadow.appendChild(content)
		
		this.content = content
	}

	static get observedAttributes() {
		return ['math-source']
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (name === 'math-source') {
			requestCallbackOnIdle(() => this.updateMath(), 1000)
		}
	}

	connectedCallback() {
		if (this.isConnected) {
			requestCallbackOnIdle(() => this.updateMath(), 1000)
		}
	}

	updateMath() {
		const mathSource = this.getAttribute('math-source')
		const isBlock = this.getAttribute('block') != undefined

		if (isBlock) {
			this.content.classList.add('block')
		}
		else {
			this.content.classList.remove('block')
		}

		try {
			katex.render(mathSource, this.content, {
				displayMode: isBlock,
				output: 'html'
			})
		}
		catch (e) {
			const splits: string[] = e.message.split(': ')
			if (isBlock) {
				const inner = splits.map(s => {
					return `<span>${s}</span>`
				}).join(': ')
				this.content.innerHTML = `<span class="error">${inner}</span>`
			}
			else {
				this.content.innerHTML = `<span class="error" title="${splits.join('\n')}">!!!</span>`
			}
			
		}
		
	}

	onClick(event: MouseEvent) {
		const source = this.getAttribute('math-source')
		const isBlock = this.getAttribute('block')

		if (isBlock) {
			markAsSelectionRequest(event, {
				line: attr => {
					return attr?.math?.source == source
				}
			})
		}
		else {
			markAsSelectionRequest(event, {
				inline: attr => {
					return attr?.math?.source == source
				}
			})
		}
		
	}
}

customElements.define('t-math', TangentMath)
export default TangentMath
