import type Workspace from '../Workspace';
import WorkspaceCommand from './WorkspaceCommand'

import { isMac } from 'common/platform'
import type { CommandContext, CommandOptions } from './Command';

export interface KeyboardEventProxyCommandOptions extends CommandOptions {
	selector: string
	focus?: boolean
	label: string
	paletteLabel?: string
	tooltip?: string
}

// TODO: Using this feels like ultimate spaghetti, but it's the best option
export default class KeyboardEventProxyCommand extends WorkspaceCommand {
	options: KeyboardEventProxyCommandOptions
	constructor(workspace: Workspace, options: KeyboardEventProxyCommandOptions) {
		super(workspace, options)
		this.options = options
	}

	execute() {
		const element = document.querySelector(this.options.selector)
		if (element) {
			const shortcut = this.options.shortcut

			const eventOptions: KeyboardEventInit = {
				bubbles: true,
				cancelable: true
			}

			for (let part of shortcut.split('+')) {
				// TODO: fill this out when things aren't working
				switch (part) {
					case 'Mod':
						if (isMac) {
							eventOptions.metaKey = true
						}
						else {
							eventOptions.ctrlKey = true
						}
						break
					case 'Shift':
						eventOptions.shiftKey = true
						break
					case 'Alt':
						eventOptions.altKey = true
						break
					case 'Up':
					case 'Down':
					case 'Left':
					case 'Right':
						eventOptions.key = 'Arrow' + part
						break
					default:
						eventOptions.key = part
						break
				}
			}

			if (this.options.focus ?? true) {
				(element as HTMLElement).focus()	
			}
			element.dispatchEvent(new KeyboardEvent('keydown', eventOptions))
		}
		else {
			console.warn(`Selector "${this.options.selector}" didn't match anything`)
		}
	}

	getLabel(context: CommandContext) {
		return this.options.label
	}

	getTooltip(context: CommandContext) {
		return this.options.tooltip
	}

	getDefaultPaletteName() {
		if (this.options.paletteLabel) return this.options.paletteLabel
		return super.getDefaultPaletteName()
	}
}
