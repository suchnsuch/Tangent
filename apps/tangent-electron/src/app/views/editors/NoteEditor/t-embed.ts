import type { Workspace } from 'app/model'
import { StructureType } from 'common/indexing/indexTypes'
import { isExternalLink } from 'common/links'

import EmbedRoot from './EmbedRoot.svelte'
import TangentLink from './t-link'
import { markAsSelectionRequest } from 'app/events'
import { deepEqual } from 'fast-equals'
import type { Readable } from 'svelte/store'
import { HandleResult } from 'app/model/NodeHandle'

class TangentEmbed extends TangentLink {

	private content: HTMLElement
	private component: EmbedRoot

	private nodeHandle: Readable<HandleResult>
	private unsubHandle: () => void

	private willUpdateState = false

	constructor() {
		super()
		const shadow = this.attachShadow({ mode: 'open' })
		
		const style = document.createElement('link')
		style.setAttribute('rel', 'stylesheet')
		style.setAttribute('href', './t-embed.css')
		shadow.appendChild(style)

		const content = document.createElement('span')
		content.style.display = 'inline-flex'
		content.style.textIndent = '0' // Defeats the default "revealed" textIndent funkiness.
		shadow.appendChild(content)
		
		this.content = content
	}

	connectedCallback() {
		if (this.isConnected) {
			this.requestUpdateState()
		}
	}

	disconnectedCallback() {
		if (this.component) {
			this.component.$destroy()
		}
	}

	static get observedAttributes() {
		return ['link-state', 'href', 'content_id', 'text', 'block']
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		switch (name) {
			case 'link-state':
				// This is a hack to ensure that the link state values *alwasy* remain, even if
				// a silly virtual dom thinks it's better than us and wants to override the
				// attributes
				if (newValue !== this.linkState) {
					this.setAttribute(name, this.linkState)
				}
				break
			case 'href':
			case 'content_id':
			case 'text':
			case 'block':
				this.requestUpdateState()
				break
		}
	}

	requestUpdateState() {
		if (!this.willUpdateState) {
			this.willUpdateState = true
			setTimeout(() => {
				this.willUpdateState = false
				this.updateState()
			}, 1);
		}
	}

	updateState() {
		// Collect props
		const link = this.getLinkInfo()
		const block = this.getAttribute('block') === 'true'

		this.content.style.display = block ? 'flex' : 'inline-flex'

		if (this.component) {
			const component = this.component
			if (component.block !== block) {
				component.block = block
			}
			if (!deepEqual(component.link, link)) {
				component.link = link
			}
		}
		else {
			this.component = new EmbedRoot({
				target: this.content,
				props: {
					link,
					block,
					workspace: (document as any).workspace as Workspace
				}
			})

			const handleForm = form => {
				if (!form || form?.mode === 'error') {
					this.setLinkState('error', null)
				}
				else {
					if (form.mode === 'image') {
						if (isExternalLink(form.src)) {
							return this.setLinkState('external', null)
						}
					}
					this.setLinkState('resolved', null)
				}
			}

			this.component.$on('form', e => handleForm(e.detail))
			handleForm(this.component.form)
		}
	}

	onClick(event: any): void {
		super.onClick(event)

		const href = this.getCleanedHref()
		markAsSelectionRequest(event, { inline: attr => {
			return attr?.t_link?.href === href
		}})
	}

	getLinkInfo() {
		const result = super.getLinkInfo()
		result.type = StructureType.Embed
		return result
	}
}

customElements.define('t-embed', TangentEmbed)
export default TangentEmbed
