import Session from 'common/dataTypes/Session'
import Workspace from '../Workspace'
import type { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'

interface ShowPreviousSessionCommandContext extends CommandContext {
	session: Session
}

export default class ShowPreviousSessionCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, { group: 'Map' })
	}

	getSession(context?: ShowPreviousSessionCommandContext): Session {
		return context?.session ?? this.workspace.viewState.tangent.activeSession.value
	}

	async execute(context?: ShowPreviousSessionCommandContext) {
		const session = this.getSession(context)

		const previousSessionPath = session?.previousSession.value
		if (!previousSessionPath) return

		const previousSessionFile = this.workspace.directoryStore.getWithPortablePath(previousSessionPath)
		if (!previousSessionFile) return

		const tangentInfo = this.workspace.viewState.tangent.tangentInfo.value
		if (!tangentInfo) return

		tangentInfo.openSessions.insert(0, previousSessionFile)
	}

	canExecute(context?: ShowPreviousSessionCommandContext): boolean {
		const session = this.getSession(context)
		const value = session?.previousSession.value
		return value != '' && value != null
	}

	getLabel(context?: CommandContext) {
		return 'Show Previous Session'
	}

	getTooltip(context?: CommandContext) {
		return 'Pulls the previous session from the archive so that it can be referenced.'
	}
}
