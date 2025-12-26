import type { Workspace } from 'app/model'
import { StructureType } from 'common/indexing/indexTypes'

import EmbedRoot from './EmbedRoot.svelte'
import TangentLink, { type LinkState } from './t-link'
import { markAsSelectionRequest } from 'app/events'
import { deepEqual } from 'fast-equals'
import type { HandleResult } from 'app/model/NodeHandle'
import type { TooltipConfig } from 'app/utils/tooltips'
import { isExternalLink } from 'common/links'

function createStyleElement(href: string) {
	const style = document.createElement('link')
	style.setAttribute('rel', 'stylesheet')
	style.setAttribute('href', href)
	return style
}

class TangentEmbed extends TangentLink {

	private content: HTMLElement
	private component: EmbedRoot
	private errorMessage: string

	private willUpdateState = false

	constructor() {
		super()
		const shadow = this.attachShadow({ mode: 'open' })
		
		shadow.appendChild(createStyleElement('./t-embed.css'))
		shadow.appendChild(createStyleElement('./media.css'))

		const content = document.createElement('span')
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
					this.setParentLinkStateClass(this.linkState)
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

	setLinkState(value: LinkState, context: HandleResult) {
		super.setLinkState(value, context)
		this.setParentLinkStateClass(value)
	}

	setParentLinkStateClass(value: LinkState) {
		const list = this.parentElement.classList
		list.remove('uninitialized', 'empty', 'resolved', 'ambiguous', 'untracked', 'external', 'error')
		list.add(value)
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
				if (!form || form.mode === 'error') {
					this.setLinkState('error', null)
					this.errorMessage = form?.message
				}
				else if (form.mode === 'pending') {
					this.setLinkState('uninitialized', null)
				}
				else {
					const url = form.src ?? form.url
					if (url && isExternalLink(url)) {
						this.setLinkState('external', null)
					}
					else {
						this.setLinkState('resolved', null)
					}
				}
			}

			this.component.$on('form', e => handleForm(e.detail))
			handleForm(this.component.form)
		}
	}

	onClick(event: MouseEvent): void {
		super.onClick(event)

		if (!event.defaultPrevented) {
			const href = this.getCleanedHref()
			markAsSelectionRequest(event, { inline: attr => {
				return attr?.t_link?.href === href
			}})
		}
	}

	getLinkInfo() {
		const result = super.getLinkInfo()
		result.type = StructureType.Embed
		return result
	}

	getTooltip(): TooltipConfig {
		const tooltip = super.getTooltip()
		tooltip.placement = 'mouse-below'
		tooltip.args.errorMessage = this.errorMessage
		return tooltip
	}
}

customElements.define('t-embed', TangentEmbed)
export default TangentEmbed
