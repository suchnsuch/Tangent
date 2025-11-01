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
	placement?: Placement | 'mouse-below' | 'mouse-below-origin'
	interactive?: boolean
	minWidth?: string
	maxWidth?: string
}

export type TooltipDefOrConfig = TooltipLiteral | TooltipConfig

type TooltipItem = {
	/** The element that spawned this tooltip */
	origin: HTMLElement
	/** The event that kicked off the tooltip */
	originEvent: MouseEvent
	/** The configuration of the tooltip */
	config: TooltipConfig
	/** The number of things keepig the item alive */
	liveCount: number
}

export const tooltips = new WritableStore<TooltipItem[]>([])

/** The tooltip queued for opening */
let queuedTooltip: TooltipItem = null
/** Timeout for whether or not a tooltip shows up or is hidden */
let tooltipTimeout: any = null

let requireDelay = true
/**
 * Timeout for turning requiring a delay back on.
 * These are separate so that you can mouse from one tooltip trigger to another over a gap.
 */
let requireTimeout: any = null

function clearTimeouts() {
	queuedTooltip = null
	if (tooltipTimeout) {
		clearTimeout(tooltipTimeout)
		tooltipTimeout = null
	}
	if (requireTimeout) {
		clearTimeout(requireTimeout)
		requireTimeout = null
	}
}

export function requestTooltip(element: HTMLElement, config: TooltipDefOrConfig, event?: MouseEvent) {
	// TODO: Detect if this tooltip request is being made from within an existing tooltip

	clearTimeouts()

	config = tooltipToConfig(config)
	if (!config.placement && event) {
		config.placement = 'mouse-below-origin'
	}

	const requestedTooltip = {
		origin: element,
		originEvent: event,
		config,
		liveCount: 1
	}

	if (tooltips.value.length === 0 && requireDelay) {
		// No active tooltips
		queuedTooltip = requestedTooltip
		tooltipTimeout = setTimeout(() => {
			requireDelay = false
			tooltips.value.push(requestedTooltip)
			tooltips.notifyObservers()
			queuedTooltip = null
		}, 1000)
	}
	else {
		// TODO: Something something children & multiple tooltips

		// Immediately swap open tooltips
		tooltips.set([requestedTooltip])
	}
}

export function pinTooltip(element: HTMLElement) {
	const item = tooltips.value.find(i => i.origin === element)
	if (item) {
		clearTimeouts()
		item.liveCount += 1
	}
}

export function dropTooltip(element: HTMLElement, delay=true) {
	const itemIndex = tooltips.value.findIndex(i => i.origin === element)
	if (itemIndex >= 0 || queuedTooltip?.origin === element) {
		clearTimeouts()
	}
	if (itemIndex < 0) return

	const item = tooltips.value[itemIndex]

	item.liveCount -= 1
	if (item.liveCount > 0) return

	const drop = () => {
		tooltips.value.splice(itemIndex, 1)
		tooltips.notifyObservers()
	}

	if (delay) {
		tooltipTimeout = setTimeout(drop, 100)
		requireTimeout = setTimeout(() => {
			requireDelay = true
		}, 500)
	}
	else {
		requireDelay = true;
		drop()
	}
}

export function dropAllTooltips() {
	clearTimeouts()
	requireDelay = true;
	tooltips.set([])
}

export function tooltipToConfig(configIsh: TooltipDefOrConfig) {
	if (!configIsh) return null
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

	function makeTooltipRequest(event: MouseEvent) {
		if ('tooltip' in node) {
			config = tooltipToConfig(node.tooltip as any)
		}
		if (config) {
			requestTooltip(node, config, event)
		}
	}

	function onLeave() {
		dropTooltip(node)
	}

	node.addEventListener('mouseenter', makeTooltipRequest)
	node.addEventListener('mousemove', makeTooltipRequest)
	node.addEventListener('mouseleave', onLeave)
	node.addEventListener('click', onLeave)

	return {
		update(def: TooltipDefOrConfig) {
			dropTooltip(node)
			config = tooltipToConfig(def)
		},
		destroy() {
			dropTooltip(node, false)
			node.removeEventListener('mouseenter', makeTooltipRequest)
			node.removeEventListener('mousemove', makeTooltipRequest)
			node.removeEventListener('mouseleave', onLeave)
			node.removeEventListener('click', onLeave)
		}
	}
}
