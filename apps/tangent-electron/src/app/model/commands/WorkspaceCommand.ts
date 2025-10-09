import Command, { AnyCommandContext, CommandContext, CommandOptions } from "./Command"
import type Workspace from "../Workspace"

export interface PaletteAction {
	name: string,
	command: WorkspaceCommand,
	context?: AnyCommandContext,
	shortcuts?: string[] | null
}

export default abstract class WorkspaceCommand extends Command {

	readonly workspace: Workspace

	constructor(workspace: Workspace, options?: CommandOptions) {
		super(options)
		this.workspace = workspace
	}

	getName() {
		return this.getLabel()
	}

	getDefaultPaletteName() {
		return this.getLabel(this.getDefaultPaletteContext())
	}

	getPaletteActions(): PaletteAction[] {
		const name = this.getDefaultPaletteName()
		if (name) {
			return [{
				name,
				command: this,
				context: this.getDefaultPaletteContext()
			}]
		}
		return []
	}

	protected getDefaultPaletteContext(): CommandContext {
		return {}
	}
}
