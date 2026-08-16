import { markAsSelectionRequest } from 'app/events'
import { defineCustomElement } from 'app/utils/defineCustomElement'
import { bindInlineSelectionListeners } from './hiddenGroupInlineElement'

const furiganaStyleSheet = new CSSStyleSheet()
furiganaStyleSheet.replaceSync(`
	ruby {
		ruby-position: over;
	}
	rt {
		font-size: .58em;
		/* The note's line-height is an absolute length, so rt would otherwise
		   inherit a full line's height and float the reading halfway up to
		   the previous line. */
		line-height: 1;
		padding-bottom: .075em;
		color: var(--deemphasizedTextColor);
	}
`)

class TangentFurigana extends HTMLElement {

	private baseNode: Text
	private readingNode: HTMLElement

	constructor() {
		super()

		bindInlineSelectionListeners(this, this.onClick)

		const shadow = this.attachShadow({ mode: 'open' })
		shadow.adoptedStyleSheets = [furiganaStyleSheet]

		const ruby = document.createElement('ruby')
		const base = document.createTextNode('')
		const rt = document.createElement('rt')
		ruby.appendChild(base)
		ruby.appendChild(rt)
		shadow.appendChild(ruby)

		this.baseNode = base
		this.readingNode = rt
	}

	static get observedAttributes() {
		return ['base', 'reading']
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (newValue === oldValue) return

		if (name === 'base') {
			this.baseNode.textContent = newValue ?? ''
		}
		else if (name === 'reading') {
			this.readingNode.textContent = newValue ?? ''
		}
	}

	onClick(event: MouseEvent) {
		const instance = this.getAttribute('instance')

		markAsSelectionRequest(event, {
			inline: attr => {
				return attr?.furigana?.instance === instance
			}
		})
	}
}

defineCustomElement('t-furigana', TangentFurigana)
export default TangentFurigana
