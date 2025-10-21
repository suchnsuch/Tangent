<script lang="ts" context="module">
export interface RequestMenuDetails {
	element: HTMLElement,
	template: ContextMenuConstructorOptions[]
}
export type RequestMenuEvent = CustomEvent<RequestMenuDetails>

export interface CancelMenuDetails {
	element: HTMLElement
}
export type CancelMenuEvent = CustomEvent<CancelMenuDetails>
</script>

<script lang="ts">
import type { ContextMenuConstructorOptions } from "app/model/menus"
import SvgIcon from "app/views/smart-icons/SVGIcon.svelte";
import { createEventDispatcher } from "svelte";
import { shortcutsHtmlString } from "./shortcuts";
import commandAction from '../model/commands/CommandAction'

let dispatch = createEventDispatcher<{
	executed: {},
	requestMenu: RequestMenuDetails
	cancelMenu: CancelMenuDetails
}>()

export let template: ContextMenuConstructorOptions
export let forceCheckboxSpace = false
let button: HTMLElement

$: shortcut = template.accelerator ?? template.command?.shortcuts

function onMouseEnter(event: MouseEvent) {
	if (template.submenu) {
		dispatch('requestMenu', {
			element: button,
			template: template.submenu as ContextMenuConstructorOptions[]
		})
	}
}

function onMouseLeave(event: MouseEvent) {
	if (template.submenu) {
		dispatch('cancelMenu', {
			element: button
		})
	}
}

function onClick() {
	const { command, commandContext, click } = template
	if (command && command.canExecute(commandContext)) {
		command.execute(commandContext)
		dispatch('executed')	
	}
	if (click) {
		click()
	}
}
</script>

<button
	bind:this={button}
	class={`menu-item no-callout ${template.type}`}
	on:mouseenter={onMouseEnter}
	on:mouseleave={onMouseLeave}
	on:click={onClick}
	use:commandAction={{
		command: template.command,
		context: template.commandContext,
		includeClick: false,
		tooltipShortcut: false
	}}
>
	{#if template.type === 'checkbox' || forceCheckboxSpace}
		<span class="checkbox">✓</span>
	{/if}
	<span class="label">{template.label || template.command?.getLabel(template.commandContext)}</span>
	{#if shortcut}
		<span class="shortcut">{@html shortcutsHtmlString(shortcut)}</span>
	{/if}
	{#if template.submenu}
		<SvgIcon
			ref="opener.svg#opener-arrow"
			size={10}
			styleString="opacity: 0.7;"/>
	{/if}
</button>

<style lang="scss">
button {
	border-radius: 0;
	text-align: left;

	padding: .25em .75em;

	display: flex;
	align-items: center;

	&.open {
		background-color: var(--accentBackgroundColor);
	}

	&:not(:disabled):not(.open):active {
		background-color: var(--accentActiveBackgroundColor);
	}

	// &:first-child {
	// 	border-top-left-radius: var(--inputBorderRadius);
	// 	border-top-right-radius: var(--inputBorderRadius);
	// }

	// &:last-child {
	// 	border-bottom-left-radius: var(--inputBorderRadius);
	// 	border-bottom-right-radius: var(--inputBorderRadius);
	// }

	&:not([checked="true"]) .checkbox {
		visibility: hidden;
	}
}

// I should not need to hack like this, but here it is
:global(button.menu-item[checked="true"]:not(:hover):not(:active)) {
	background-color: transparent;
}

span.checkbox {
	margin-right: .5em;
}

span {
	white-space: pre;
}

.label {
	flex-grow: 1;
}
.shortcut {
	margin-left: 2em;
}
</style>
