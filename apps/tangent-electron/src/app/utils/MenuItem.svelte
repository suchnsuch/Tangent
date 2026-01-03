<script lang="ts" context="module">
export type ExecuteMenuCallback = () => void
export type RequestMenuCallback = (element: HTMLElement, template: ContextMenuConstructorOptions[]) => void
export type CancelMenuCallback = (element: HTMLElement) => void
</script>

<script lang="ts">
import type { Workspace } from 'app/model'
import type { ContextMenuConstructorOptions } from "app/model/menus"
import SvgIcon from "app/views/smart-icons/SVGIcon.svelte";
import { getContext } from "svelte";
import { shortcutsHtmlString } from "./shortcuts";
import commandAction from '../model/commands/CommandAction'

const workspace = getContext('workspace') as Workspace

export let template: ContextMenuConstructorOptions
export let forceCheckboxSpace = false

export let onExecuted: ExecuteMenuCallback
export let onRequestMenu: RequestMenuCallback
export let onCancelMenu: CancelMenuCallback

let button: HTMLElement

$: shortcut = template.accelerator ?? template.command?.shortcuts

function onMouseEnter(event: MouseEvent) {
	if (template.submenu && onRequestMenu) {
		onRequestMenu(button, template.submenu)
	}
}

function onMouseLeave(event: MouseEvent) {
	if (template.submenu && onCancelMenu) {
		onCancelMenu(button)
	}
}

function onClick(event: Event) {
	const { command, commandContext, click, link } = template
	if (command && command.canExecute(commandContext)) {
		command.execute({
			initiatingEvent: event,
			...commandContext
		})
		if (onExecuted) onExecuted()
	}
	if (click) {
		click()
	}
	if (link) {
		workspace.api.links.openExternal(link)
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
	<span class="label">{template.label || template.command?.getLabel(template.commandContext) || template.role}</span>
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
