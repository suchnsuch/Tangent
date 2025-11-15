<script lang="ts">
import { eventIsModifier, shortcutDisplayString, shortcutFromEvent } from './shortcuts'
import { tooltip } from './tooltips'

export let validate: (shortcut: string) => string = null
export let onCancel: () => void = null
export let onAccept: (shortcut: string) => void = null

export let value: string = null

let editText: string = value ?? ''
let errorText: string = ''
let editElement: HTMLInputElement = null
let placeholder = 'Add Shortcut'
$: if (value === null) editElement?.focus(); else if (document.activeElement !== editElement) editText = value

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
	on:keydown={onEditKeyDown}
	on:keyup={onEditKeyUp}
	on:focus={onFocus}
	on:blur={onBlur}
	{placeholder}
/>
{#if errorText}
	<span use:tooltip={errorText}>⚠</span>
{/if}