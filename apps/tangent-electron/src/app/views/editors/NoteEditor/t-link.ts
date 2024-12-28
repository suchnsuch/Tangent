import { requestCallbackOnIdle } from '@such-n-such/core'
import type { Workspace } from 'app/model'
import { TreeNode } from 'common/trees'
import { HrefForm, HrefFormedLink, StructureType } from 'common/indexing/indexTypes'
import { isExternalLink } from 'common/links'
import { isMac } from 'common/isMac'
import { HandleResult, isNode } from 'app/model/NodeHandle'

type LinkState = 'uninitialized' | 'empty' | 'resolved' | 'ambiguous' | 'untracked' | 'external' | 'error'

function getClickMessage(name='', location='in a new pane.') {
	let result = isMac ? '⌘+Click' : 'Ctrl+Click'
	result += ' or middle-click to open '
	if (name) {
		result += name + ' '
	}
	result += location
	return result
}

function linkStateTooltip(state: LinkState, context: HandleResult) {
	switch (state) {
		case 'uninitialized':
			return undefined
		case 'empty':
			return '\"' + (context as TreeNode).name + '\" is virtual.\n' + getClickMessage('it')
		case 'resolved':
			return context
				? getClickMessage('\"' + (context as TreeNode).name + '\"')
				: getClickMessage()
		case 'ambiguous':
			const workspace = (document as any).workspace as Workspace
			const nodePaths = (context as TreeNode[]).map(n => workspace.directoryStore.pathToPortablePath(n.path))
			return `This link is ambigious between ${nodePaths.length} files:\n`
				+ nodePaths.map(p => '    - ' + p).join('\n')
		case 'external':
			return getClickMessage('', 'in your default browser.')
		case 'untracked':
			const store  = ((document as any).workspace as Workspace).directoryStore
			let target = store.pathToRelativePath(context as string)
			if (target === false) {
				target = context as string
			}
			return getClickMessage(`\"${target}\"`, 'in its default application.')
		case 'error':
			return 'Something went wrong resolving this link.'
	}
}

class TangentLink extends HTMLElement {

	protected linkState: LinkState
	protected tooltip: string
	handleUnsub: () => void

	constructor() {
		super()
		this.addEventListener('click', this.onClick)
		this.addEventListener('auxclick', this.onClick)
		this.addEventListener('dblclick', this.onClick)
		this.addEventListener('mousedown', this.onClick)
		this.addEventListener('mouseup', this.onClick)
		this.addEventListener('contextmenu', this.onClick)
	}

	connectedCallback() {
		if (this.isConnected) {
			requestCallbackOnIdle(() => this.updateState(), 1000)
		}
	}

	disconnectedCallback() {
		this.dropNodeHandle()
	}

	static get observedAttributes() {
		return ['link-state', 'title', 'href', 'content_id', 'form', 'from']
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
			case 'title':
				// This is a hack to ensure that the link state values *alwasy* remain, even if
				// a silly virtual dom thinks it's better than us and wants to override the
				// attributes
				if (newValue !== this.tooltip) {
					this.setAttribute(name, this.tooltip)
				}
				break;
			case 'href':
			case 'content_id':
				requestCallbackOnIdle(() => this.updateState(), 1000)
				break
		}
	}

	updateState() {
		let link = this.getLinkInfo()
		if (link) {
			if (isExternalLink(link.href)) {
				this.setLinkState('external', null)
				this.dropNodeHandle()
			}
			else {
				const doc = document as any
				const workspace = doc.workspace as Workspace
				if (workspace) {
					this.dropNodeHandle()
					this.handleUnsub = workspace
						.getHandle(link)
						.subscribe(v => this.onNodeHandleChanged(v))
				}
			}
		}
		else {
			this.setLinkState('resolved', null)
		}
	}
	
	private onNodeHandleChanged(value: HandleResult) {
		let newState: LinkState = 'empty'

		if (typeof value === 'string') {
			newState = 'untracked'
		}
		else if (Array.isArray(value)) {
			if (value.length > 1) {
				newState = 'ambiguous'
			}
		}
		else if (value) {
			if (isNode(value)) {
				let contentId = this.getAttribute('content_id')
				if (contentId) {
					// TODO
				}
				newState = 'resolved'
			}
			else {
				newState = 'external'
			}
		}

		this.setLinkState(newState, value)
	}

	private dropNodeHandle() {
		if (this.handleUnsub) {
			this.handleUnsub()
			this.handleUnsub = null
		}
	}

	getLinkState() {
		return this.linkState
	}

	setLinkState(value: LinkState, context: HandleResult) {
		this.linkState = value
		this.setAttribute('link-state', value)
		this.tooltip = linkStateTooltip(value, context)
		this.setAttribute('title', this.tooltip)
	}

	onClick(event) {
		event.tLink = this
	}

	getCleanedHref() {
		let href = this.getAttribute('href')
		if (this.linkState === 'external') return href
		return decodeURIComponent(href)
	}

	getLinkInfo(): HrefFormedLink {
		return {
			type: StructureType.Link,
			href: this.getCleanedHref(),
			form: this.getAttribute('form') as HrefForm,
			from: this.getAttribute('from'),
			content_id: this.getAttribute('content_id'),
			text: this.getAttribute('text')
		}
	}

	static isTangentLinkEvent(event: Event) {
		return this.getTangentLinkFromEvent(event) !== undefined
	}

	static getTangentLinkFromEvent(event: Event) {
		return (event as any).tLink as TangentLink
	}
}

customElements.define('t-link', TangentLink)
export default TangentLink
