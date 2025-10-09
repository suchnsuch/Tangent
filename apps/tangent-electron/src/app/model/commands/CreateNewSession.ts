import type { ThreadHistoryItem } from 'common/dataTypes/Session'
import type { Workspace } from '..'
import type { CommandContext, CommandOptions } from './Command'
import WorkspaceCommand from './WorkspaceCommand'

export class CreateNewSessionCommand extends WorkspaceCommand {

	constructor(workspace: Workspace) {
		super(workspace, { group: 'Map' })
	}

	execute(context?: CommandContext) {
		const tangent = this.workspace.viewState.tangent
		const tangentInfo = tangent.tangentInfo.value

		const newSessionFile = tangent.createSession()

		tangentInfo.openSessions.add(newSessionFile)
		tangentInfo.activeSession.set(newSessionFile)
	}

	getLabel(context?: CommandContext) {
		return 'Create New Session'
	}

	getTooltip(context?: CommandContext) {
		return 'Creates a new session with its own thread history and map. The previous session will still be visible in the map view.'
	}
}

export interface CreateNewSessionFromThreadCommandContext extends CommandContext {
	thread: ThreadHistoryItem
}

export class CreateNewSessionFromThreadCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, { group: 'Map' })
	}

	execute(context?: CreateNewSessionFromThreadCommandContext) {
		const tangent = this.workspace.viewState.tangent
		const tangentInfo = tangent.tangentInfo.value

		const thread = context?.thread ?? tangent.activeSession.value?.currentThread.value

		const newSessionFile = tangent.createSession(session => {
			if (thread) {
				session.addThreadHistory(thread)
			}
		})

		tangentInfo.openSessions.add(newSessionFile)
		tangentInfo.activeSession.set(newSessionFile)
	}

	getLabel(context?: CreateNewSessionFromThreadCommandContext) {
		if (context?.thread) {
			return 'Create New Session from Thread'
		}
		return 'Create New Session from Current Thread'
	}

	getTooltip(context?: CommandContext) {
		return 'Creates a new session that is seeded with the given thread. The previous session will still be visible in the map view.'
	}
}
