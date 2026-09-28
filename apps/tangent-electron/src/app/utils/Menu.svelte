<script lang="ts">
import { onMount } from "svelte"
import { type Placement, createPopper } from "@popperjs/core"

import type { ContextMenuConstructorOptions } from "app/model/menus"
import MenuItem from "./MenuItem.svelte"
import type { ExecuteMenuCallback, RequestMenuCallback, RequestMenuOptions } from './MenuItem.svelte'
import arrowNavigate from "./arrowNavigate"

export let template: ContextMenuConstructorOptions[]
export let placementElement: HTMLElement = null
export let placement: Placement = 'bottom'

/** Called when an item has been triggered */
export let onExecuted: ExecuteMenuCallback
export let onRequestMenu: RequestMenuCallback = null
/** Called when a menu wishes to exit after doing nothing */
export let onCanceled: (event: Event) => void = null

$: hasAnyCheckboxes = determineHasCheckboxes(template)
function determineHasCheckboxes(template: ContextMenuConstructorOptions[]) {
	for (const item of template) {
		if (item.type === 'checkbox') {
			return true
		}
	}
	return false
}

let menu: HTMLElement

onMount(() => {
	if (placementElement) {
		const popper = createPopper(placementElement, menu, {
			placement,
			strategy: 'fixed',
			modifiers: [
				{
					name: 'offset',
					options: {
						offset: [-4, 0]
					}
				}
			]
		})

		const item = menu.querySelector('.menu-item')
		if (item instanceof HTMLElement) {
			item.focus()
		}

		return () => {
			popper.destroy()
		}
	}
})

// Delay used when transitioning from a menu to a non-menu or vice-versa
const menuDelay = 200
// Delay used when transitioning from one menu to another
const interMenuDelay = 50

type SubmenuData = {
	element: HTMLElement
	template: ContextMenuConstructorOptions[]
	timeout?: any
}

let incomingMenu: SubmenuData = null
let shownMenu: SubmenuData = null
let outgoingMenu: SubmenuData = null

function handleRequestMenu(
	element: HTMLElement,
	subTemplate: ContextMenuConstructorOptions[],
	options?: RequestMenuOptions
) {
	if (incomingMenu && incomingMenu.element !== element && incomingMenu.timeout) {
		// Shown menu has not yet landed, and should be discarded
		clearTimeout(incomingMenu.timeout)
		incomingMenu = null
	}

	if (shownMenu && shownMenu.element !== element) {
		// Close other menus, forcing so that they close faster
		cancelShownMenu(interMenuDelay, true)
	}

	if (outgoingMenu?.element === element) {
		// Don't cancel this menu
		clearTimeout(outgoingMenu.timeout)
		outgoingMenu.timeout = null
		outgoingMenu = null
	}

	if (!(incomingMenu?.element === element || shownMenu?.element === element)) {
		// Prepare to place the incoming menu
		incomingMenu = {
			element,
			template: subTemplate
		}

		const delay = options?.useDelay === false ? 0 :
			(outgoingMenu ? interMenuDelay : menuDelay)

		incomingMenu.timeout = setTimeout(() => {
			shownMenu = incomingMenu
			incomingMenu = null
			shownMenu.element.classList.add('open')
		}, delay)
	}

	// Propagate menu request up the chain
	if (onRequestMenu) onRequestMenu(placementElement, template)
}

function cancelShownMenu(delay, force = false) {
	if (shownMenu !== outgoingMenu || force) {
		const targetMenu = outgoingMenu = shownMenu
		if (targetMenu.timeout) {
			clearTimeout(targetMenu.timeout)
		}
		targetMenu.timeout = setTimeout(() => {
			if (targetMenu.timeout) {
				clearTimeout(targetMenu.timeout)
				targetMenu.timeout = null
			}
			targetMenu.element.classList.remove('open')
			if (targetMenu === shownMenu) shownMenu = null
			if (targetMenu === outgoingMenu) outgoingMenu = null
		}, delay)
	}
}

function handleCancelMenu(element: HTMLElement) {
	if (incomingMenu?.element === element) {
		clearTimeout(incomingMenu.timeout)
		incomingMenu = null
	}

	if (shownMenu?.element === element) {
		cancelShownMenu(menuDelay)
	}
}

function onMouseEnter() {
	if (placementElement && onRequestMenu) {
		onRequestMenu(placementElement, template)
	}
}

function onKeyDown(event: KeyboardEvent) {
	if (onCanceled && (event.key === 'ArrowLeft' || event.key === 'Escape')) {
		event.preventDefault()
		onCanceled(event)
	}
}

function handleCancelSubmenu(event: Event) {
	const restoreTarget = shownMenu?.element
	cancelShownMenu(0, true)
	if (restoreTarget && event instanceof KeyboardEvent) {
		restoreTarget.focus()
	}
}

</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<nav bind:this={menu}
	on:mouseenter={onMouseEnter}
	on:keydown={onKeyDown}
	use:arrowNavigate={{
		targetSelector: '.menu-item:not(:disabled)'
	}}
>
	{#each template as item}
		{#if item.type === 'separator'}
			<div class="separator"></div>
		{:else}
			<MenuItem
				template={item}
				forceCheckboxSpace={hasAnyCheckboxes}
				{onExecuted}
				onRequestMenu={handleRequestMenu}
				onCancelMenu={handleCancelMenu}
			/>
		{/if}
	{/each}
</nav>

{#if shownMenu}
	<svelte:self
		template={shownMenu.template}
		placementElement={shownMenu.element}
		placement="right-start"
		{onExecuted}
		onRequestMenu={handleRequestMenu}
		onCanceled={handleCancelSubmenu}
	/>
{/if}

<style lang="scss">
nav {
	font-size: 90%;
	display: flex;
	flex-direction: column;

	min-width: 10em;

	box-shadow: 0 0 10px rgba(0, 0, 0, .3);
	background-color: var(--transparentBackgroundColor);
	backdrop-filter: blur(20px);

	border-radius: var(--inputBorderRadius);
	padding: var(--inputBorderRadius) 0;
}

.separator {
	border-top: 1px solid var(--borderColor);
	opacity: .7;
	margin: .5em 0em;
}
</style>
