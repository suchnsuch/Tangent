import type { AnyCommandContet } from './commands/Command'
import type WorkspaceCommand from './commands/WorkspaceCommand'

export interface ContextMenuCommand {
	command?: WorkspaceCommand
	commandContext?: AnyCommandContet,
	click?: () => void
}

export interface ContextMenuConstructorOptions extends ContextMenuCommand {
	id?: string
	type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio',
	label?: string
	sublabel?: string
	toolTip?: string
	accelerator?: string

	enabled?: boolean
	checked?: boolean

	submenu?: ContextMenuConstructorOptions[]
}

export interface SplitContextMenuTemplate {
	top?: ContextMenuConstructorOptions[]
	bottom?: ContextMenuConstructorOptions[]
}

interface ContextMenuContext extends SplitContextMenuTemplate {
	commands: Map<string, ContextMenuCommand>
}

export type ExtendedContextEvent = MouseEvent & SplitContextMenuTemplate

export function appendContextTemplate(event: ExtendedContextEvent, template: ContextMenuConstructorOptions[], section: 'top' | 'bottom' = 'top') {
	const t = section === 'top' ? (event.top = event.top ?? []) : (event.bottom = event.bottom ?? [])

	t.push({ type: 'separator' })
	for (const item of template) {
		t.push(item)
	}
}

export function extractRawTemplate(template: SplitContextMenuTemplate): SplitContextMenuTemplate {
	return {
		top: template.top,
		bottom: template.bottom
	}
}

export function prepareContextMenuCommands(template: SplitContextMenuTemplate | ContextMenuConstructorOptions[]): ContextMenuContext {
	const context: ContextMenuContext = {
		commands: new Map()
	}

	if (Array.isArray(template)) {
		context.top = template
	}
	else {
		context.top = template.top
		context.bottom = template.bottom
	}

	let commandIDCount = 0

	function recursiveConverter(item: ContextMenuConstructorOptions) {

		if (item.command || item.click) {

			const command = item.command
			const commandContext = item.commandContext || {}
			const click = item.click

			delete item.command
			delete item.commandContext
			delete item.click

			if (command) {
				if (!command.canExecute(commandContext)) {
					// Do the can execute processing now
					item.enabled = false
				}

				const tooltip = command.getTooltip(commandContext)
				if (tooltip) {
					item.toolTip = tooltip
				}

				const checked = command.getChecked(commandContext)
				if (checked) {
					item.checked = true
				}

				if (!item.label) {
					const label = command.getLabel(commandContext)
					if (label) {
						item.label = label
					}
					else {
						console.error('Items need labels!', item, command, commandContext)
					}
				}

				if (item.accelerator === undefined && command.shortcuts?.length > 0) {
					item.accelerator = command.shortcuts[0]
				}
			}				

			item.id = 'context_' + commandIDCount++
			context.commands.set(item.id, {
				command, commandContext, click
			})
		}

		if (item.accelerator) {
			(item as any).registerAccelerator = false
			item.accelerator = item.accelerator.replace(/Mod/ig, 'CommandOrControl')
		}

		if (Array.isArray(item.submenu)) {
			for (const sub of item.submenu) {
				recursiveConverter(sub)
			}
		}
	}

	if (context.top) {
		for (const item of context.top) {
			recursiveConverter(item)
		}
	}
	
	if (context.bottom) {
		for (const item of context.bottom) {
			recursiveConverter(item)
		}
	}

	return context
}
