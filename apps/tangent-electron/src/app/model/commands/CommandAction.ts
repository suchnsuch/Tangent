import { shortcutDisplayString, shortcutsDisplayString } from 'app/utils/shortcuts';
import Command, { CommandContext } from "./Command";

export interface CommandActionOptions {
	command: Command
	context?: CommandContext
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
	let applyToolTip = !node.hasAttribute('title') || !node.getAttribute('title')

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

		if (applyToolTip) {
			let tooltip = (options.labelAsTooltip && command.getLabel(context)) ?? command.getTooltip(context)
			if (tooltip) {
				if (shortcutText && options.tooltipShortcut !== false) {
					tooltip += ' – ' + shortcutText
				}

				node.setAttribute('title', tooltip)
			}
		}
		else if (isFirstPass && shortcutText) {
			let tooltip = node.getAttribute('title')
			tooltip += ' – ' + shortcutText
			node.setAttribute('title', tooltip)
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

	function clickHandler(event: MouseEvent) {
		if (event.defaultPrevented) return
		command.execute(Object.assign({ event }, context))
		if (options.preventDefault) {
			event.preventDefault()
		}
	}

	if (options.includeClick ?? true) {
		node.addEventListener('click', clickHandler)
	}

	let unsub = command.subscribe(() => {
		updateFromContext()
	})

	return {
		update,
		destroy() {
			unsub()
			node.removeEventListener('click', clickHandler)
		}
	}
}
