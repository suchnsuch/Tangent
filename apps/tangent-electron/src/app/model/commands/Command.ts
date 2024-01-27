import { eventIsShortcutable, shortcutFromEvent } from 'app/utils/shortcuts'

// Extend to provide type-safe context
export interface CommandContext {
	/** Only present on execution */
	initiatingEvent?: Event
}

export type AnyCommandContet = CommandContext & { [key: string]: any }

export interface CommandOptions {
	shortcut?: string
	shortcuts?: string[]
}

type CommandSubscriber = (command: Command) => void

export default abstract class Command {

	shortcuts: string[]

	private canExecuteDirty: boolean = false

	private subscribers: CommandSubscriber[] = []

	constructor(options?: CommandOptions) {
		if (options?.shortcuts) {
			this.shortcuts = options.shortcuts
		}
		else if (options?.shortcut) {
			this.shortcuts = [options.shortcut]
		}
	}

	protected alertDirty() {
		if (this.canExecuteDirty === false) {
			this.canExecuteDirty = true

			requestAnimationFrame(() => {
				this.canExecuteDirty = false
				this.subscribers.forEach(s => s(this))
			})
		}
	}

	canExecute(context?: CommandContext): boolean {
		return true
	}

	execute(context?: CommandContext) {
		console.error('Command\'s execute() function has not been defined.')
	}

	subscribe(subscriber: CommandSubscriber): () => void {
		this.subscribers.push(subscriber)

		return () => {
			const index = this.subscribers.indexOf(subscriber)
			if (index >= 0) {
				this.subscribers.splice(index, 1)
			}
		}
	}

	getTooltip(context?: CommandContext) {
		return null
	}

	getChecked(context?: CommandContext): boolean | null {
		return null
	}

	getLabel(context?: CommandContext) {
		return null
	}
}

export function createCommandHandler(commands: Command[]) {
	return (event: KeyboardEvent) => {
		if (event.defaultPrevented) return
		if (!eventIsShortcutable(event)) return

		const shortcut = shortcutFromEvent(event)
		const context = { initiatingEvent: event }

		for (const command of commands) {
			if (command.shortcuts?.includes(shortcut) && command.canExecute(context)) {
				event.preventDefault()
				console.log(`Executing "${command.getLabel(context)}" by way of ${shortcut}`)
				command.execute(context)
				return
			}
		}
	}
}
