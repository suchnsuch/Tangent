import { eventIsShortcutable, shortcutFromEvent } from 'app/utils/shortcuts'

// Extend to provide type-safe context
export interface CommandContext {
	/** Only present on execution */
	initiatingEvent?: Event
}

export type AnyCommandContext = CommandContext & { [key: string]: any }

export interface CommandOptions {
	/**
	 * The group this command exists in for the purposes of binding collision.
	 * A blank group implicitly means "global".
	 * Groups can be nested. "foo.bar" is a sub-group of "foo".
	 */
	group?: string

	/** Shortcuts set on construction are considered the default shortcuts */
	shortcuts?: string[]
	/** Alias for a single shortcut */
	shortcut?: string
}

type CommandSubscriber = (command: Command) => void

export default abstract class Command {

	group: string
	defaultShortcuts: string[]
	shortcuts: string[]

	private canExecuteDirty: boolean = false

	private subscribers: CommandSubscriber[] = []

	constructor(options?: CommandOptions) {
		this.group = options?.group ?? ''
		
		if (options?.shortcuts) {
			this.shortcuts = options.shortcuts
		}
		else if (options?.shortcut) {
			this.shortcuts = [options.shortcut]
		}
		this.defaultShortcuts = this.shortcuts?.slice()
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

type CommandHandlerOptions = {
	buildContext?(context: CommandContext)
}

export function createCommandHandler(commands: Command[], options?: CommandHandlerOptions) {
	return (event: KeyboardEvent) => {
		if (event.defaultPrevented) return
		if (!eventIsShortcutable(event)) return

		const shortcut = shortcutFromEvent(event)
		const context = { initiatingEvent: event }

		if (options?.buildContext) {
			options.buildContext(context)
		}

		for (const command of commands) {
			if (command.shortcuts?.includes(shortcut) && command.canExecute(context)) {
				event.preventDefault()
				console.log(`Executing "${command.getLabel(context)}" by way of ${shortcut}`)
				command.execute(context)
				return true
			}
		}

		return false
	}
}
