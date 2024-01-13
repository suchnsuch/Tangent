import type Workspace from "../Workspace";
import type { CommandContext, CommandOptions } from "./Command";
import WorkspaceCommand, { PaletteAction } from "./WorkspaceCommand";

import CommandPalette from '../../modal/CommandPalette.svelte'

interface ShowCommandPaletteCommandContext extends CommandContext {
	prefix?: string
}

interface ShowCommandPaletteCommandOptions extends CommandOptions {
	prefix?: string,
	tooltip?: string
}

export default class ShowCommandPaletteCommand extends WorkspaceCommand {

	prefix: string
	tooltip: string

	constructor(workspace: Workspace, options?: ShowCommandPaletteCommandOptions) {
		super(workspace, options)

		if (options) {
			this.prefix = options.prefix
			this.tooltip = options.tooltip
		}

		workspace.viewState.modal.currentComponent.subscribe(() => this.alertDirty())
	}

	canExecute(context: ShowCommandPaletteCommandContext) {
		return this.workspace.viewState.modal.isActive === false
	}

	execute(context: ShowCommandPaletteCommandContext) {
		const prefix = context?.prefix ?? this.prefix
		const modal = this.workspace.viewState.modal
		if (modal.isActive === false) {
			modal.set(CommandPalette, { prefix })
		}
	}

	getLabel(context: ShowCommandPaletteCommandContext) {
		const prefix = context?.prefix ?? this.prefix
		if (!prefix) {
			return 'Open File'
		}
		if (prefix.match(/^> ?$/)) {
			return 'Open Command Palette'
		}
	}

	getTooltip(context: CommandContext) {
		if (this.tooltip) return this.tooltip

		const prefix = context?.prefix ?? this.prefix
		if (!prefix) {
			return 'Opens a search box for all files.'
		}
		if (prefix.match(/^> ?$/)) {
			return 'Opens a search box for all commands.'
		}
	}

	getPaletteActions() {
		// No reason for this to do anything ever
		return []
	}
}
