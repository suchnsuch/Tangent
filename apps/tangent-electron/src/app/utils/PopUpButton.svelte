<script lang="ts" module>
let nextPopUpId = 1
function getPopUpId() {
	return nextPopUpId++
}
</script>

<script lang="ts">
import { createPopper } from '@popperjs/core'
import type { Placement } from '@popperjs/core'
import type { Command } from 'app/model/commands'
import type { AnyCommandContext } from 'app/model/commands/Command'
import commandAction from 'app/model/commands/CommandAction'
import type { CommandActionOptions } from 'app/model/commands/CommandAction'
import { focusLayer } from './focus'
import { onMount, tick, untrack, type Snippet } from 'svelte';
import type { ContextMenuConstructorOptions } from 'app/model/menus';
import Menu from './Menu.svelte'
import { tooltip as tooltipHelper, type TooltipDefOrConfig, dropTooltip } from './tooltips';
import { PopupEvent, type PopUpCloseHandler } from './popUpButton'

let {
	name = '',
	placement = 'bottom',
	buttonClass = 'popup',
	menuMode = 'normal',
	closeMenuOnClick = false,
	blurWhenFinished = true,
	escapeToRoot = true,
	showMenu = $bindable(false),

	command,
	commandContext,

	menu,
	button,

	template,
	tooltip,

	showPopUpIndicator,
	onDoubleClick,
}: {
	name?: string
	placement?: Placement
	buttonClass?: string
	menuMode?: 'normal' | 'low-profile'
	closeMenuOnClick?: boolean
	blurWhenFinished?: boolean
	escapeToRoot?: boolean
	showMenu?: boolean

	command?: Command
	commandContext?: AnyCommandContext

	menu?: Snippet
	button?: Snippet

	/**
	 * The template for a menu _or_ a function that returns the template.
	 * A function will be called each time the menu is opened.
	 */
	template?: ContextMenuConstructorOptions[] | (() => ContextMenuConstructorOptions[])

	tooltip?: TooltipDefOrConfig

	showPopUpIndicator?: boolean
	onDoubleClick?: (event: MouseEvent) => void
} = $props()

const popUpId = getPopUpId()

let allIds: Set<any> = null

onMount(() => {
	return () => {
		removePopup()

		if (menuElement && menuElement.isConnected) {
			menuElement.parentElement.removeChild(menuElement)
		}

		if (buttonElement && tooltip) {
			dropTooltip(buttonElement, false)
		}
	}
})

let buttonElement: HTMLButtonElement = $state()
let menuElement: HTMLElement = $state()
let popper: ReturnType<typeof createPopper> = null
let closeHandlers: PopUpCloseHandler[] = null

let commandParams: CommandActionOptions = $derived(command ? {
	command,
	context: commandContext,
	includeClick: false,
	tooltip
} : null)

let label = $derived(name || command?.getLabel(commandContext))

let willShowPopUpIndicator = $derived((typeof showPopUpIndicator === 'boolean')
	? showPopUpIndicator
	: command != null
)

$effect(() => {
	let shouldShow = showMenu && buttonElement && menuElement
	untrack(() => {
		if (shouldShow) {
			if (popper) {
				popper.update()
			}
			else {
				if (escapeToRoot) {
					// This allows the menu to bypass all restrictions of where it was created
					document.body.appendChild(menuElement)

					const item = menuElement.querySelector('.menu-item')
					if (item instanceof HTMLElement) {
						tick().then(() => {
							item.focus()
						})
					}
				}
				popper = createPopper(buttonElement, menuElement, {
					placement,
					strategy: 'fixed'
				})
				window.addEventListener('click', windowClick)
				window.addEventListener('contextmenu', windowClick)
				window.addEventListener('keydown', windowKey)

				const event = new PopupEvent('popup-open', {
					isOpen: true,
					bubbles: true,
				})

				buttonElement.dispatchEvent(event)

				closeHandlers = event.closeHandlers
			}

			tick().then(() => {
				if (menuElement) {
					const menuRect = menuElement.getBoundingClientRect()
					menuElement.style.maxHeight = `${window.innerHeight-menuRect.top}px`
				}
			})
		}
		else {
			removePopup()
		}
	})
})

function removePopup() {
	if (popper) {
		popper.destroy()
		popper = null
		window.removeEventListener('click', windowClick)
		window.removeEventListener('contextmenu', windowClick)
		window.removeEventListener('keydown', windowKey)

		if (closeHandlers) {
			for (const handler of closeHandlers) {
				handler()
			}
			closeHandlers = null
		}
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
	dropTooltip(buttonElement)

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
	dropTooltip(buttonElement)
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
	if (!event.defaultPrevented && event.key === 'Escape') {
		showMenu = false
	}
}

function onMenuCanceled(event: Event) {
	showMenu = false
	if (event instanceof KeyboardEvent) {
		buttonElement.focus()
	}
}
</script>

<button
	bind:this={buttonElement}
	class={buttonClass}
	class:open={showMenu}
	class:has-opener={willShowPopUpIndicator}
	onclick={buttonClick}
	oncontextmenu={buttonContext}
	ondblclick={onDoubleClick}
	use:commandAction={commandParams}
	use:focusLayer={'PopUpButton'}
	use:tooltipHelper={commandParams ? null : tooltip}
>
	<span class="buttonContent">{#if button}{@render button()}{:else}{label}{/if}</span>
	{#if willShowPopUpIndicator}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span class="opener"
			onclick={openPopUp}
		><svg><use href="opener.svg#opener-arrow"/></svg></span>
	{/if}
</button>

{#if showMenu}
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class={`menu ${menuMode}`} class:templated={template != null}
	use:focusLayer={'PopUpButton-Content'}
	bind:this={menuElement}
	onclick={menuClick}
>
	{#if menu}
		{@render menu()}
	{:else if template}
		<Menu
			template={Array.isArray(template) ? template : template()}
			onExecuted={() => showMenu = false}
			onCanceled={onMenuCanceled}
		/>
	{:else}
		Add content to this menu to fill it in
	{/if}
</div>
{/if}

<style lang="scss">
.menu {
	z-index: 1000000000; // LOL
	
	background-color: var(--transparentBackgroundColor);
	backdrop-filter: blur(20px);
	border-radius: var(--inputBorderRadius);
	box-shadow: 0 0 10px rgba(0, 0, 0, .3);

	&.normal:not(.templated) {
		padding: 1rem;
		box-sizing: border-box;
		overflow-y: auto;
	}

	&.templated {
		background: none;
		backdrop-filter: none;
		box-shadow: none;
		padding: 0;
	}
}

button {
	display: inline-flex;
	flex-direction: row;
	gap: .25em;

	align-items: stretch !important;

	.buttonContent {
		display: flex;
		align-items: center;
		gap: .25em;
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
