<script lang="ts">
import { createEventDispatcher, onMount } from "svelte"
import { Placement, createPopper } from "@popperjs/core"

import type { ContextMenuConstructorOptions } from "app/model/menus"
import MenuItem, { CancelMenuDetails, CancelMenuEvent, RequestMenuDetails, RequestMenuEvent } from "./MenuItem.svelte"

export let template: ContextMenuConstructorOptions[]
export let placementElement: HTMLElement = null
export let placement: Placement = 'bottom'

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

		return () => {
			popper.destroy()
		}
	}
})

// Delay used when transitioning from a menu to a non-menu or vice-versa
const menuDelay = 200
// Delay used when transitioning from one menu to another
const interMenuDelay = 50

type SubmenuData = RequestMenuDetails & {
	timeout?: any
}

let dispatch = createEventDispatcher<{
	executed: {},
	requestMenu: RequestMenuDetails
	cancelMenu: CancelMenuDetails
}>()

let incomingMenu: SubmenuData = null
let shownMenu: SubmenuData = null
let outgoingMenu: SubmenuData = null

function onRequestMenu(event: RequestMenuEvent) {
	const { element, template: subTemplate } = event.detail
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

		incomingMenu.timeout = setTimeout(() => {
			shownMenu = incomingMenu
			incomingMenu = null
			shownMenu.element.classList.add('open')
		}, outgoingMenu ? interMenuDelay : menuDelay)
	}

	// Propegate menu request up the chain
	dispatch('requestMenu', {
		element: placementElement,
		template
	})
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

function onCancelMenu(event: CancelMenuEvent) {
	const { element } = event.detail
	if (incomingMenu?.element === element) {
		clearTimeout(incomingMenu.timeout)
		incomingMenu = null
	}

	if (shownMenu?.element === element) {
		cancelShownMenu(menuDelay)
	}
}

function onMouseEnter() {
	if (placementElement) {
		dispatch('requestMenu', {
			element: placementElement,
			template
		})
	}
}

function onMouseLeave() {
	if (placementElement) {
		// dispatch('cancelMenu', {
		// 	element: placementElement
		// })
	}
}

</script>

<nav bind:this={menu}
	on:mouseenter={onMouseEnter}
	on:mouseleave={onMouseLeave}>
	{#each template as item}
		{#if item.type === 'separator'}
			<div class="separator"></div>
		{:else}
			<MenuItem
				template={item}
				forceCheckboxSpace={hasAnyCheckboxes}
				on:executed
				on:requestMenu={onRequestMenu}
				on:cancelMenu={onCancelMenu}
			/>
		{/if}
	{/each}
</nav>

{#if shownMenu}
	<svelte:self
		template={shownMenu.template}
		placementElement={shownMenu.element}
		placement="right-start"
		on:executed
		on:requestMenu={onRequestMenu}
		on:cancelMenu={onCancelMenu}/>
{/if}

<style lang="scss">
nav {
	font-size: 90%;
	display: flex;
	flex-direction: column;

	min-width: 10em;

	box-shadow: 0 0 10px rgba(0, 0, 0, .3);
	background: var(--backgroundColor);

	border-radius: var(--inputBorderRadius);
	padding: var(--inputBorderRadius) 0;
}

.separator {
	border-top: 1px solid var(--deemphasizedTextColor);
	opacity: .7;
	margin: .25em .5em;
}
</style>
