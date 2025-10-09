import type Session from 'common/dataTypes/Session'
import type Workspace from '../Workspace'
import type { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import type DataFile from '../DataFile'

interface MergeWithPreviousSessionCommandContext extends CommandContext {
	session: Session
}

export default class MergeWithPreviousSessionCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, { group: 'Map' })
	}

	getSession(context?: MergeWithPreviousSessionCommandContext): Session {
		return context?.session ?? this.workspace.viewState.tangent.activeSession.value
	}

	async execute(context?: MergeWithPreviousSessionCommandContext) {
		const session = this.getSession(context)

		const result = await this.workspace.viewState.modal.pushConfirmDialogue({
			title: 'Merge Sessions?',
			message: `<p>Are you sure you want to merge this session with the previous session?</p>
			<p>This cannot be undone.</p>`
		})

		if (!result) return

		// Find the previous session
		const tangent = this.workspace.viewState.tangent
		const sessionIndex = tangent.openSessions.value.indexOf(session)
		const previousSession = tangent.openSessions.value[sessionIndex - 1]
		if (!previousSession) return

		// Apply the history of the current session to the previous session
		previousSession.mergeWith(session)

		// Promote the old session to current & remove current
		const tangentInfo = tangent.tangentInfo.value
		tangentInfo.activeSession.set(previousSession._file as DataFile)
		tangentInfo.openSessions.remove(session._file as DataFile)

		// Delete old current session
		this.workspace.commands.deleteNode.execute({ target: session._file })
	}

	canExecute(context?: MergeWithPreviousSessionCommandContext): boolean {
		const session = this.getSession(context)

		// Find the previous session
		const tangent = this.workspace.viewState.tangent
		const sessionIndex = tangent.openSessions.value.indexOf(session)

		return tangent.openSessions.value[sessionIndex - 1] != undefined
	}

	getLabel(context?: MergeWithPreviousSessionCommandContext) {
		return 'Merge With Previous Session'
	}

	getDefaultPaletteName() {
		return 'Merge Current Session With Previous Session'
	}

	getTooltip(context?: CommandContext) {
		return 'The content of the session will be merged with the previous session. Thread history will be applied on top, and the map connections will be merged together.'
	}
}
