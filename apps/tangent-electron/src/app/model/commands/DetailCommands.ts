import type { DetailsViewState } from '../nodeViewStates'
import type Workspace from '../Workspace'
import type { CommandContext, CommandOptions } from './Command'
import WorkspaceCommand from './WorkspaceCommand'

export interface OpenDetailsOptions extends CommandOptions {
	mode: boolean | 'toggle'
}

export class OpenDetailsCommand extends WorkspaceCommand {

	mode: boolean | 'toggle'

	constructor(workspace: Workspace, options: OpenDetailsOptions) {
		super(workspace, options)

		this.mode = options.mode
	}

	canExecute(context?: CommandContext): boolean {
		const view = this.workspace.viewState.tangent.getCurrentViewState()
		return view?.details != null
	}

	execute(context?: CommandContext): void {
		const view = this.workspace.viewState.tangent.getCurrentViewState()
		if (!view?.details) return
		view.details.update(details => {
			return {
				...details,
				open: this.getTargetOpen(details)
			}
		})
	}

	getTargetOpen(details: DetailsViewState) {
		if (typeof this.mode === 'boolean') return this.mode
		return !(details?.open ?? false)
	}

	getLabel(context?: CommandContext) {
		if (this.mode === false) return 'Close Details'
		return 'Open Details'
	}

	getTooltip(context?: CommandContext) {
		if (this.mode === false) return 'Closes the details of the current panel.'
		return 'Opens the details of the current panel.'
	}
}
