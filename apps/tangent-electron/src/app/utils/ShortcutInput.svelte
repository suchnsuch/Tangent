<script lang="ts">
import { eventIsModifier, shortcutDisplayString, shortcutFromEvent } from './shortcuts'
import { tooltip } from './tooltips'

export let validate: (shortcut: string) => string = null
export let onCancel: () => void = null
export let onAccept: (shortcut: string) => void

let editText: string = ''
let errorText: string = ''
let editElement: HTMLInputElement = null
$: editElement?.focus()

function onEditKeyDown(event: KeyboardEvent) {
	event.preventDefault()
	if (event.key === 'Escape') {
		if (onCancel) onCancel()
		return
	}

	if (eventIsModifier(event)) return

	const shortcut = shortcutFromEvent(event)
	editText = shortcutDisplayString(shortcut)
	errorText = validate ? validate(shortcut) : null

	if (!errorText) onAccept(shortcut)
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
	on:blur={onCancel}
	placeholder="Press Shortcut"
/>
{#if errorText}
	<span use:tooltip={errorText}>⚠</span>
{/if}