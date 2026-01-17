import type { Workspace } from "..";
import type { NodeViewSettingsVisibility } from "../nodeViewStates/NodeViewState";
import type { CommandContext, CommandOptions } from "./Command"
import WorkspaceCommand from "./WorkspaceCommand"

export interface OpenPaneSettingsOptions extends CommandOptions {
	mode: boolean | 'toggle'
}

export class OpenPaneSettingsCommand extends WorkspaceCommand {
	mode: boolean | 'toggle'

	constructor(workspace: Workspace, options: OpenPaneSettingsOptions) {
		super(workspace, options)

		this.mode = options.mode
	}

	canExecute(context?: CommandContext): boolean {
		const view = this.workspace.viewState.tangent.currentThreadState.value
		return view?.showSettings != null
	}

	execute(context?: CommandContext): void {
		const view = this.workspace.viewState.tangent.currentThreadState.value
		if (!view?.showSettings) return

		view.showSettings.update(value => {
			return this.getTargetShow(value)
		})
	}

	getTargetShow(visibility: NodeViewSettingsVisibility) {
		if (typeof this.mode === 'boolean') return this.mode
		return visibility === false ? true : false
	}

	getLabel(context?: CommandContext) {
		if (this.mode === false) return 'Close Pane Settings'
		return 'Open Pane Settings'
	}

	getTooltip(context?: CommandContext) {
		if (this.mode === false) return 'Closes the settings for the current pane.'
		return 'Opens the settings for the current pane.'
	}
}
