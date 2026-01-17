<script lang="ts">
import { eventIsModifier, shortcutDisplayString, shortcutFromEvent } from './shortcuts'
import { tooltip } from './tooltips'

interface Props {
	validate?: (shortcut: string) => string
	onCancel?: () => void
	onAccept?: (shortcut: string) => void

	value?: string
	class?: string
}

let {
	validate,
	onCancel,
	onAccept,
	value = $bindable(null),
	...props
}: Props = $props()

let editText: string = $state(value ?? '')
let errorText: string = $state('')
let editElement: HTMLInputElement = $state(null)
let placeholder = $state('Add Shortcut')

$effect(() => {
	console.log('value', value)
	if (value === null) editElement?.focus()
	else if (document.activeElement !== editElement) editText = value
})

function onFocus() {
	editText = ''
	placeholder = 'Press Shortcut'
}

function onBlur() {
	editText = value ?? ''
	if (onCancel) onCancel()
	placeholder = 'Add Shortcut'
}

function onEditKeyDown(event: KeyboardEvent) {
	event.preventDefault()
	if (event.key === 'Escape') {
		editElement.blur()
		return
	}

	if (eventIsModifier(event)) return

	const shortcut = shortcutFromEvent(event)
	editText = shortcutDisplayString(shortcut)
	errorText = validate ? validate(shortcut) : null

	if (!errorText) {
		if (value !== null) value = shortcut
		if (onAccept) onAccept(shortcut)
		editElement.blur()
	}
}

function onEditKeyUp(event: KeyboardEvent) {
	event.preventDefault()
}

</script>
<input
	bind:this={editElement}
	bind:value={editText}
	onkeydown={onEditKeyDown}
	onkeyup={onEditKeyUp}
	onfocus={onFocus}
	onblur={onBlur}
	class={props.class}
	{placeholder}
/>
{#if errorText}
	<span use:tooltip={errorText}>⚠</span>
{/if}