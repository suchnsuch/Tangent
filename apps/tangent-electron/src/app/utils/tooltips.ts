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
	maxWidth?: string
}

export type TooltipDefOrConfig = TooltipLiteral | TooltipConfig

type TooltipItem = {
	/** The element that spawned this tooltip */
	origin: HTMLElement
	/** The configuration of the tooltip */
	config: TooltipConfig
}

export const tooltips = new WritableStore<TooltipItem[]>([])

/** Timeout for whether or not a tooltip shows up or is hidden */
let tooltipTimeout: any = null

let requireDelay = true
/**
 * Timeout for turning requiring a delay back on.
 * These are separate so that you can mouse from one tooltip trigger to another over a gap.
 */
let requireTimeout: any = null

function clearTimeouts() {
	if (tooltipTimeout) {
		clearTimeout(tooltipTimeout)
		tooltipTimeout = null
	}
	if (requireTimeout) {
		clearTimeout(requireTimeout)
		requireTimeout = null
	}
}

export function requestTooltip(element: HTMLElement, config: TooltipDefOrConfig) {
	// TODO: Detect if this tooltip request is being made from within an existing tooltip

	clearTimeouts()

	const requestedTooltip = {
		origin: element,
		config: tooltipToConfig(config)
	}

	if (tooltips.value.length === 0 && requireDelay) {
		// No active tooltips
		tooltipTimeout = setTimeout(() => {
			requireDelay = false
			tooltips.value.push(requestedTooltip)
			tooltips.notifyObservers()
		}, 800)
	}
	else {
		// TODO: Something something children & multiple tooltips

		// Immediately swap open tooltips
		tooltips.set([requestedTooltip])
	}
}

export function dropTooltip(element: HTMLElement) {
	clearTimeouts()

	const itemIndex = tooltips.value.findIndex(i => i.origin === element)
	if (itemIndex < 0) return

	// Placed tooltips stick around a little longer. Mouse-relative ones do not.
	const delay = tooltips.value[itemIndex].config.placement ? 300 : 0

	tooltipTimeout = setTimeout(() => {
		tooltips.value.splice(itemIndex, 1)
		tooltips.notifyObservers()
	}, delay)

	requireTimeout = setTimeout(() => {
		requireDelay = true
	}, 500)
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
	node.addEventListener('click', onLeave)

	return {
		update(def: TooltipDefOrConfig) {
			config = tooltipToConfig(def)
		},
		destroy() {
			node.removeEventListener('mouseenter', onEnter)
			node.removeEventListener('mouseleave', onLeave)
			node.removeEventListener('click', onLeave)
		}
	}
}
