import type { WritableStore } from 'common/stores'

export default function editable(node: HTMLElement, value: WritableStore<string>) {

	function update(v: string) {
		node.textContent = v
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault()
			node.blur()
		}
	}

	function setValueFromElement() {
		value.set(node.textContent)
	}

	node.contentEditable = 'true'
	node.addEventListener('blur', setValueFromElement)
	node.addEventListener('keydown', onKeydown)

	let unsub = value.subscribe(update)

	return {
		update,
		destroy() {
			unsub()

			node.removeEventListener('blur', setValueFromElement)
			node.removeEventListener('keydown', onKeydown)
		}
	}
}