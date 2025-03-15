import { WritableStore } from 'common/stores'
import { SvelteConstructor } from './svelte'
import { Placement } from '@floating-ui/dom'

export type TooltipFunction = () => TooltipDefOrConfig
export type TooltipLiteral = string | SvelteConstructor

export type TooltipConfig = {
	/** The tooltip that will be rendered */
	tooltip: TooltipLiteral
	/** Any arguments to be passed to a component */
	args?: any
	shortcut?: string
	placement?: Placement
}

export type TooltipDefOrConfig = TooltipLiteral | TooltipConfig

type TooltipItem = {
	/** The element that spawned this tooltip */
	origin: HTMLElement
	/** The configuration of the tooltip */
	config: TooltipConfig
}

export const tooltips = new WritableStore<TooltipItem[]>([])

let tooltipTimeout: any = null

export function requestTooltip(element: HTMLElement, config: TooltipDefOrConfig) {
	// TODO: Detect if this tooltip request is being made from within an existing tooltip

	// New input always resets timers
	if (tooltipTimeout) {
		clearTimeout(tooltipTimeout)
		tooltipTimeout = null
	}

	const requestedTooltip = {
		origin: element,
		config: tooltipToConfig(config)
	}

	if (tooltips.value.length === 0) {
		// No active tooltips
		tooltipTimeout = setTimeout(() => {
			tooltips.value.push(requestedTooltip)
			tooltips.notifyObservers()
		}, 800)
	}
	else {
		// TODO: Something something children

		// Immediately swap open tooltips
		tooltips.set([requestedTooltip])
	}
}

export function dropTooltip(element: HTMLElement) {
	const itemIndex = tooltips.value.findIndex(i => i.origin === element)
	if (itemIndex < 0) return
	
	if (tooltipTimeout) {
		clearTimeout(tooltipTimeout)
		tooltipTimeout = null
	}

	tooltipTimeout = setTimeout(() => {
		console.log('Dropping tooltip', tooltips.value[itemIndex])
		tooltips.value.splice(itemIndex, 1)
		tooltips.notifyObservers()
	}, 300)
}

export function tooltipToConfig(configIsh: TooltipDefOrConfig) {
	if (typeof configIsh === 'string' || !('tooltip' in configIsh)) {
		configIsh = { tooltip: configIsh }
	}
	return configIsh as TooltipConfig
}

/**
 * A use:tooltip function for Svelte.
 * Can do `use:tooltip={"My text"}` for a simple tooltip
 * or dig into specifics for more complicated ones.
 */
export function tooltip(node: HTMLElement, def: TooltipDefOrConfig) {
	if (!def) return

	let config = tooltipToConfig(def)

	function onEnter() {
		if ('tooltip' in node) {
			config = tooltipToConfig(node.tooltip as any)
		}
		requestTooltip(node, config)
	}

	function onLeave() {
		dropTooltip(node)
	}

	node.addEventListener('mouseenter', onEnter)
	node.addEventListener('mouseleave', onLeave)

	return {
		destroy() {
			node.removeEventListener('mouseenter', onEnter)
			node.removeEventListener('mouseleave', onLeave)
		}
	}
}
