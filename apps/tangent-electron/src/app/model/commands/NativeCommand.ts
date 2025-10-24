import { Workspace } from '..';
import { CommandContext, CommandOptions } from './Command';
import WorkspaceCommand from './WorkspaceCommand';

type NativeCommandRole = 'cut' | 'copy' | 'paste' | 'pasteAndMatchStyle' | 'selectAll' | 'undo' | 'redo'

interface NativeCommandOptions extends CommandOptions {
	role: NativeCommandRole
	label: string
	tooltip: string
}

export class NativeCommand extends WorkspaceCommand {
	role: NativeCommandRole
	label: string
	tooltip: string
	
	constructor(workspace: Workspace, options: NativeCommandOptions) {
		super(workspace, options)
		this.role = options.role
		this.label = options.label
		this.tooltip = options.tooltip
	}

	execute(context?: CommandContext): void {
		this.workspace.api.edit.nativeAction(this.role)
	}

	getLabel(context?: CommandContext) {
		return this.label
	}

	getTooltip(context?: CommandContext) {
		return this.tooltip
	}

	getDefaultPaletteName() {
		return null // Disable the palette for these
	}
}