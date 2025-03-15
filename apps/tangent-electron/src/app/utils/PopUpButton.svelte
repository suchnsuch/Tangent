<script lang="ts" context="module">
let nextPopUpId = 1
function getPopUpId() {
	return nextPopUpId++
}
</script>

<script lang="ts">
import { createPopper } from '@popperjs/core'
import type { Placement } from '@popperjs/core'
import type { Command } from 'app/model/commands'
import type { AnyCommandContet, CommandContext } from 'app/model/commands/Command'
import commandAction from 'app/model/commands/CommandAction'
import type { CommandActionOptions } from 'app/model/commands/CommandAction'
import { focusLayer } from './focus'
import { onMount, tick } from 'svelte';
import type { ContextMenuConstructorOptions } from 'app/model/contextmenu';
import Menu from './Menu.svelte'
import { tooltip as tooltipHelper, TooltipDefOrConfig } from './tooltips';
	
export let name = ''
export let placement: Placement = 'bottom'
export let buttonClass = 'popup'
export let hidePopUpIndicator = false
export let menuMode: 'normal' | 'low-profile' = 'normal'
export let closeMenuOnClick = false
export let blurWhenFinished = true

export let escapeToRoot = true

export let command: Command = null
export let commandContext: AnyCommandContet = null
/**
 * The template for a menu _or_ a function that returns the template.
 * A function will be called each time the menu is opened.
 */
export let template: ContextMenuConstructorOptions[] | (() => ContextMenuConstructorOptions[]) = null

export let tooltip: TooltipDefOrConfig = null

// Exported so that binding back up can be used
export let showMenu = false

const popUpId = getPopUpId()

let allIds: Set<any> = null

onMount(() => {
	return () => {
		if (popper) {
			popper.destroy()
			popper = null
		}

		if (menuElement && menuElement.isConnected) {
			menuElement.parentElement.removeChild(menuElement)
		}
	}
})

let buttonElement: HTMLButtonElement
let menuElement: HTMLElement
let popper = null

let commandParams: CommandActionOptions = command ? {
	command,
	context: commandContext,
	includeClick: false,
	tooltip
} : null

$: update(buttonElement, menuElement, showMenu)
function update(button, menu: HTMLElement, show) {
	if (show && button && menu) {
		if (popper) {
			popper.update()
		}
		else {
			if (escapeToRoot) {
				// This allows the menu to bypass all restrictions of where it was created
				document.body.appendChild(menuElement)
			}
			popper = createPopper(button, menu, {
				placement,
				strategy: 'fixed'
			})
			window.addEventListener('click', windowClick)
			window.addEventListener('contextmenu', windowClick)
			window.addEventListener('keydown', windowKey)
		}

		tick().then(() => {
			const menuRect = menu.getBoundingClientRect()
			menu.style.maxHeight = `${window.innerHeight-menuRect.top}px`
		})
	}
	else if (popper) {
		popper.destroy()
		popper = null
		window.removeEventListener('click', windowClick)
		window.removeEventListener('contextmenu', windowClick)
		window.removeEventListener('keydown', windowKey)

		buttonElement.dispatchEvent(new Event('popup-close', {
			bubbles: true
		}))
	}
}

function markAsPopupClick(event) {
	if (!event.popup) event.popup = allIds ?? new Set()
	const set = event.popup as Set<any>
	set.add(popUpId)
}

function isEventMarked(event) {
	return event.popup && event.popup.has(popUpId)
}

function buttonClick(event: MouseEvent) {
	if (isEventMarked(event)) {
		// This has already been handled
		return
	}

	if (showMenu) {
		showMenu = false
		if (blurWhenFinished) {
			buttonElement.blur()
		}
	}
	else if (command && command.canExecute(commandContext)) {
		command.execute(Object.assign({}, commandContext, {
			initiatingEvent: event
		}))
		
		if (blurWhenFinished) {
			buttonElement.blur()
		}
	}
	else if (!command) {
		openPopUp(event)
	}
}

function buttonContext(event: MouseEvent) {
	openPopUp(event)
}

function openPopUp(event: Event) {
	event.preventDefault()
	markAsPopupClick(event)
	showMenu = !showMenu

	Promise.resolve().then(() => {
		allIds = (event as any).popup
	})
}

function menuClick(event: MouseEvent) {
	if (!closeMenuOnClick) {
		markAsPopupClick(event)
	}
}

function windowClick(event: MouseEvent) {
	if (!isEventMarked(event)) {
		showMenu = false
	}
}

function windowKey(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		showMenu = false
	}
}
</script>

<button
	bind:this={buttonElement}
	class={buttonClass}
	class:open={showMenu}
	class:has-opener={command != null && !hidePopUpIndicator}
	on:click={buttonClick}
	on:contextmenu={buttonContext}
	use:commandAction={commandParams}
	use:focusLayer={'PopUpButton'}
	use:tooltipHelper={commandParams ? null : tooltip}
>
	<span class="buttonContent"><slot name="button">{name}</slot></span>
	{#if command && !hidePopUpIndicator}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<span class="opener"
			on:click={openPopUp}
		><svg><use href="opener.svg#opener-arrow"/></svg></span>
	{/if}
</button>

{#if showMenu}
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class={`menu ${menuMode}`} class:templated={template != null}
	use:focusLayer={'PopUpButton'}
	bind:this={menuElement}
	on:click={menuClick}
>
	<slot>
		{#if template}
			<Menu
				template={Array.isArray(template) ? template : template()}
				on:executed={() => showMenu = false}
			/>
		{:else}
			Add content to this menu to fill it in
		{/if}
	</slot>
</div>
{/if}

<style lang="scss">
.menu {
	z-index: 1000000000; // LOL
	background: var(--backgroundColor);
	
	border-radius: var(--inputBorderRadius);
	box-shadow: 0 0 10px rgba(0, 0, 0, .3);

	&.normal:not(.templated) {
		padding: 1rem;
		box-sizing: border-box;
		overflow-y: auto;
	}

	&.templated {
		background: none;
		box-shadow: none;
		padding: 0;
	}
}

button {
	display: inline-flex;
	flex-direction: row;

	align-items: stretch !important;

	.buttonContent {
		display: flex;
		align-items: center;
	}

	&.has-opener {
		padding-right: 0;
	}
	.opener {
		padding-left: .2em;
		padding-right: .2em;
		display: flex;
		align-items: center;
	}

	svg {
		width: 8px;
		height: 8px;
		transform: rotate(90deg);
	}
}
</style>
