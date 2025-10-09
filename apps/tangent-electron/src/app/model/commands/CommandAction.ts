import { shortcutsDisplayString } from 'app/utils/shortcuts';
import Command, { AnyCommandContext, CommandContext } from "./Command";
import { dropTooltip, requestTooltip, TooltipDefOrConfig, TooltipFunction, tooltipToConfig } from 'app/utils/tooltips';
import { Placement } from '@floating-ui/dom';

export interface CommandActionOptions {
	command: Command
	context?: AnyCommandContext
	/** If false, click handler will not be added. Default true. */
	includeClick?: boolean
	/** If true, will prevent the default behavior of the click. Default false. */
	preventDefault?: boolean
	/**
	 * If false, element will not be disabled when the command can't run. Default true.
	 * This could result in errors if includeClick is not also set to false.
	 */
	includeDisable?: boolean
	/** If true, the label text will be used at the tooltip. */
	labelAsTooltip?: boolean
	/** Whether to include the shortcut in the label. Default false. */
	labelShortcut?: boolean
	/** Whether to include the shortcut in the tooltip. Default true. */
	tooltipShortcut?: boolean
	/** A tooltip override */
	tooltip?: TooltipDefOrConfig,
	/** A function that returns a tooltip */
	getToolTip?: () => TooltipDefOrConfig,
	tooltipPlacement?: Placement
}

const defaultOptions: CommandActionOptions = {
	command: null
}

type commandParams = Command | CommandActionOptions

export default function command(node: HTMLElement, params: commandParams) {
	if (!params) return

	const [command, options] = (params instanceof Command) ? [params, defaultOptions] : [params.command, params]
	if (!command) return

	let context: CommandContext = null

	let applyLabel = node.childNodes.length === 0

	let tooltip: TooltipFunction = null

	let isFirstPass = true

	function updateFromContext() {
		if (options.includeDisable ?? true) {
			if (command.canExecute(context)) {
				node.removeAttribute('disabled')
			}
			else {
				node.setAttribute('disabled', '')
			}
		}

		const shortcuts = command.shortcuts
		const shortcutText = shortcuts ? shortcutsDisplayString(shortcuts) : ''

		if (applyLabel) {
			const labelText = command.getLabel(context)
			const labelSpan = document.createElement('span')
			labelSpan.innerText = labelText
			labelSpan.classList.add('label')
			const labelChildren = [labelSpan] as Node[]

			if (options.labelShortcut) {
				if (shortcuts) {
					labelChildren.push(document.createTextNode(' '))
					const labelShortcut = document.createElement('span')
					labelShortcut.innerText = shortcutText
					labelShortcut.classList.add('shortcut')
					labelChildren.push(labelShortcut)
				}
			}

			node.replaceChildren(...labelChildren)
		}

		tooltip = () => {
			let tooltip: TooltipDefOrConfig = (options.getToolTip && options.getToolTip())
				?? options.tooltip
				?? (options.labelAsTooltip && command.getLabel(context))
				?? command.getTooltip(context)
			
			if (tooltip) {
				tooltip = tooltipToConfig(tooltip)
				if (shortcutText && options.tooltipShortcut !== false) {
					tooltip.shortcut = shortcutText
				}
				if (options.tooltipPlacement) {
					tooltip.placement = options.tooltipPlacement
				}
			}
			return tooltip
		}

		const checked = command.getChecked(context)
		if (checked) {
			node.setAttribute('checked', 'true')
		}
		else {
			node.removeAttribute('checked')
		}

		// TODO: Tooltip, etc
	}

	function update(params: commandParams) {
		if (!(params instanceof Command)) {
			context = params?.context ?? {}
		}
		updateFromContext()
	}

	update(params)
	isFirstPass = false

	function makeTooltipRequest(event: MouseEvent) {
		if (tooltip) {
			requestTooltip(node, tooltip(), event)
		}
	}

	function onLeave(event: MouseEvent) {
		if (tooltip) {
			dropTooltip(node)
		}
	}

	function clickHandler(event: MouseEvent) {
		onLeave(event) // Disable tooltips
		if (event.defaultPrevented) return
		command.execute(Object.assign({ event }, context))
		if (options.preventDefault) {
			event.preventDefault()
		}
	}

	if (options.includeClick ?? true) {
		node.addEventListener('click', clickHandler)
	}

	node.addEventListener('mouseenter', makeTooltipRequest)
	node.addEventListener('mousemove', makeTooltipRequest)
	node.addEventListener('mouseleave', onLeave)

	let unsub = command.subscribe(() => {
		updateFromContext()
	})

	return {
		update,
		destroy() {
			unsub()
			if (tooltip) {
				dropTooltip(node, false)
			}
			node.removeEventListener('click', clickHandler)
			node.removeEventListener('mouseenter', makeTooltipRequest)
			node.removeEventListener('mousemove', makeTooltipRequest)
			node.removeEventListener('mouseleave', onLeave)
		}
	}
}
