import type Session from 'common/dataTypes/Session'
import type { Workspace } from '..'
import type { CommandContext, CommandOptions } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import { derived } from 'svelte/store'

export interface ShiftThreadHistoryCommandContext extends CommandContext {
	direction: 1 | -1
	session: Session
	
}

export interface ShiftThreadHistoryCommandOptions extends CommandOptions {
	direction: 1 | -1
}

export default class ShiftThreadHistoryCommand extends WorkspaceCommand {

	defaultDirection: 1 | -1 = 1

	constructor(workspace: Workspace, options: ShiftThreadHistoryCommandOptions) {
		super(workspace, options)

		this.defaultDirection = options?.direction

		const tangent = this.workspace.viewState.tangent
		derived(tangent.activeSession, (session, set) => {
			if (!session) {
				return
			}
			return derived(session.currentThread, thread => {
				this.alertDirty()
			}).subscribe(set)
		}).subscribe(_ => {})
	}

	execute(context?: ShiftThreadHistoryCommandContext): void {
		const direction = context?.direction ?? this.defaultDirection
		const tangent = this.workspace.viewState.tangent
		const session = context?.session ?? tangent.activeSession.value
		
		session.shiftHistory(direction)
	}

	canExecute(context?: ShiftThreadHistoryCommandContext): boolean {
		const direction = context?.direction ?? this.defaultDirection
		const tangent = this.workspace.viewState.tangent
		const session = context?.session ?? tangent.activeSession.value
		if (!session) return false

		const currentIndex = session.threadIndex.value
		if (direction > 0) {
			return currentIndex < session.threadHistory.length - 1
		}
		if (direction < 0) {
			return currentIndex > 0
		}
	}

	getName() {
		const direction = this.defaultDirection

		if (direction > 0) {
			return 'Go Forward'
		}
		else {
			return 'Go Back'
		}
	}

	getLabel(context?: ShiftThreadHistoryCommandContext) {
		const direction = context?.direction ?? this.defaultDirection

		if (direction > 0) {
			return '➡︎'
		}
		else {
			return '⬅︎'
		}
	}

	getDefaultPaletteName() {
		this.getName()
	}

	getTooltip(context?: ShiftThreadHistoryCommandContext) {
		const direction = context?.direction ?? this.defaultDirection

		if (direction > 0) {
			return 'Go Forward in Thread History'
		}
		else {
			return 'Go Backward in Thread History'
		}
	}
}
