<script lang="ts" module>
export type ExecuteMenuCallback = () => void
export type RequestMenuOptions = {
	/** Defaults to true. Set to false to disable show delay. */
	useDelay?: boolean
}
export type RequestMenuCallback = (
	element: HTMLElement,
	template: ContextMenuConstructorOptions[],
	options?: RequestMenuOptions
) => void
export type CancelMenuCallback = (element: HTMLElement) => void
</script>

<script lang="ts">
import type { Workspace } from 'app/model'
import type { ContextMenuConstructorOptions } from "app/model/menus"
import SvgIcon from "app/views/smart-icons/SVGIcon.svelte";
import { getContext, untrack } from "svelte";
import { shortcutsHtmlString } from "./shortcuts";
import commandAction from '../model/commands/CommandAction'

const workspace = getContext('workspace') as Workspace

let {
	template,
	forceCheckboxSpace = false,
	onExecuted,
	onRequestMenu,
	onCancelMenu,
} : {
	template: ContextMenuConstructorOptions
	forceCheckboxSpace?: boolean

	/** Called when the menu item is executed */
	onExecuted: ExecuteMenuCallback
	/** Called when the menu wants to present a submenu */
	onRequestMenu: RequestMenuCallback
	/** Called when the menu item no longer wants to present a submenu */
	onCancelMenu: CancelMenuCallback
} = $props()

let button: HTMLElement = $state()

let shortcut = $derived(template.accelerator ?? template.command?.shortcuts)
let canExecute = $derived(template.click || template.command || template.link)

let showMenu = $state(false)

function onMouseEnter(event: MouseEvent) {
	if (!canExecute && template.submenu) {
		showMenu = true
	}
}

function onMouseMove(event: MouseEvent) {
	if (!canExecute || !template.submenu || !onRequestMenu) return
	
	let { clientX, clientY } = event

	const rect = button.getBoundingClientRect()

	clientX -= rect.x
	clientY -= rect.y

	showMenu = clientX > (rect.width - 32)
}

function onMouseLeave(event: MouseEvent) {
	if (template.submenu) {
		showMenu = false
	}
}

$effect(() => {
	if (showMenu) {
		if (button && onRequestMenu) {
			untrack(() => {
				onRequestMenu(button, template.submenu)
			})
		}
	}
	else {
		if (button && onCancelMenu) {
			untrack(() => {
				onCancelMenu(button)
			})
		}
	}
})

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
		if (onExecuted) onExecuted()
	}
	if (link) {
		workspace.api.links.openExternal(link)
		if (onExecuted) onExecuted()
	}
}

function onKeyDown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		if (template.command || template.click || template.link) {
			onClick(event)
			event.preventDefault()
		}
		else if (template.submenu) {
			onRequestMenu(button, template.submenu, {
				useDelay: false
			})
			event.preventDefault()
		}
	}
	else if (event.key === 'ArrowRight') {
		if (template.submenu) {
			onRequestMenu(button, template.submenu, {
				useDelay: false
			})
			event.preventDefault()
		}
	}
}

$effect(() => {
	if (!template.command && typeof template.checked === 'boolean') {
		if (template.checked) {
			button.setAttribute('checked', 'true')
		}
		else {
			button.removeAttribute('checked')
		}
	}
})

</script>

<button
	bind:this={button}
	class={`menu-item no-callout ${template.type}`}
	onmouseenter={onMouseEnter}
	onmousemove={onMouseMove}
	onmouseleave={onMouseLeave}
	onclick={onClick}
	onkeydown={onKeyDown}
	use:commandAction={{
		command: template.command,
		context: template.commandContext,
		includeClick: false,
		tooltipShortcut: false
	}}
>
	{#if template.type === 'checkbox' || template.type === 'radio' || forceCheckboxSpace}
		<span class="checkbox">✓</span>
	{/if}
	<span class="label">{template.label || template.command?.getLabel(template.commandContext) || template.role}</span>
	{#if shortcut}
		<span class="shortcut">{@html shortcutsHtmlString(shortcut)}</span>
	{/if}
	{#if template.submenu}
		<span class="opener" class:hidden={canExecute && template.submenu}>
			<SvgIcon
				ref="opener.svg#opener-arrow"
				size={10}
				styleString="opacity: 0.7;"/>
		</span>
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
.opener.hidden {
	opacity: 0;
	transition: opacity .2s;
	--iconStroke: var(--deemphasizedTextColor);
}
:hover > .opener.hidden, :global([data-input-mode="keyboard"]) :focus .opener.hidden {
	visibility: visible;
	opacity: 1;
}
</style>
