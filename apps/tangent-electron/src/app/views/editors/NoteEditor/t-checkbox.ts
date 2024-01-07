const svgNamespace = "http://www.w3.org/2000/svg"

class TangentCheckbox extends HTMLElement {

	input: HTMLElement

	constructor() {
		super()

		this.addEventListener('click', this.onClick)

		const shadow = this.attachShadow({ mode: 'open' })

		const style = document.createElement('link')
		style.setAttribute('rel', 'stylesheet')
		style.setAttribute('href', './t-checkbox.css')
		shadow.appendChild(style)

		const checkbox = document.createElementNS(svgNamespace, 'svg')

		// the stylesheet sometimes does not engage immediately
		// critical styles need to be set here to avoid a styling flicker
		checkbox.style.display = 'block'
		checkbox.style.position = 'relative'
		checkbox.style.top = '.25em'
		checkbox.style.right = '.15em'
		checkbox.style.width = '1em'
		checkbox.style.height = '1em'

		const innerCheckbox = document.createElementNS(svgNamespace, 'use')
		innerCheckbox.setAttribute('href', 't-checkbox.svg#box')
		checkbox.appendChild(innerCheckbox)

		shadow.appendChild(checkbox)
	}

	onClick(event) {
		event.tCheckbox = this
	}

	static isTangentCheckboxEvent(event: Event) {
		return this.getTangentCheckboxFromEvent(event) !== undefined
	}

	static getTangentCheckboxFromEvent(event: Event) {
		return (event as any).tCheckbox as TangentCheckbox
	}
}

customElements.define('t-checkbox', TangentCheckbox)
export default TangentCheckbox
