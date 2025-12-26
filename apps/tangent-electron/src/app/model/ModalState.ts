import type { SvelteConstructor } from 'app/utils/svelte'
import type { Props } from 'app/utils/types'
import { writable, type Writable } from 'svelte/store'
import ModalConfirm from 'app/modal/ModalConfirm.svelte'

interface ModalStackItem {
	component: SvelteConstructor
	properties: Props
}


type ModalButtonDefinition = {
	text: string
	tooltip?: string
	click: () => void
}

type ModalConfirmArgs = {
	title: string
	message: string
	buttons?: ModalButtonDefinition[]
}

export default class ModalState {

	stack: ModalStackItem[] = []

	currentComponent: Writable<SvelteConstructor>
	currentProperties: Writable<Props>

	constructor() {
		this.currentComponent = writable(null)
		this.currentProperties = writable(null)
	}

	get isActive(): boolean {
		return this.stack.length > 0
	}

	push(component: SvelteConstructor, properties: Props) {
		this.stack.push({
			component,
			properties
		})
		this.refreshStores()
	}

	set(component: SvelteConstructor, properties: Props) {
		this.stack = [{
			component,
			properties
		}]
		this.refreshStores()
	}

	pop() {
		this.stack.pop()
		this.refreshStores()
	}

	close() {
		this.stack = []
		this.refreshStores()
	}

	get depth() {
		return this.stack.length
	}

	private refreshStores() {
		const item = this.stack[this.stack.length - 1]
		this.currentComponent.set(item?.component)
		this.currentProperties.set(item?.properties)
	}

	pushConfirmDialogue(args: ModalConfirmArgs) {
		const { title, message } = args
		const buttonInputs = args.buttons ?? [
			{
				text: 'Cancel',
				tooltip: 'Reject the action',
				click: () => false
			},
			{
				text: 'Ok',
				tooltip: 'Approve the action',
				click: () => true
			}
		]

		return new Promise((resolve, reject) => {

			const buttons = buttonInputs.map(b => {
				return {
					text: b.text,
					tooltip: b.tooltip,
					click: () => {
						const result = b.click()
						this.pop()
						resolve(result)
					}
				}
			})

			this.push(ModalConfirm, {
				title, message, buttons
			})
		})
	}
}
