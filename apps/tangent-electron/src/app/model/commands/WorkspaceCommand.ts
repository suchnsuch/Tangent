import Command from "./Command"
import type { AnyCommandContext, CommandContext, CommandOptions } from "./Command"
import type Workspace from "../Workspace"

export interface PaletteAction {
	name: string,
	command: WorkspaceCommand,
	context?: AnyCommandContext,
	shortcuts?: string[] | null
}

export interface WorkspaceCommandContext extends CommandContext {
	context?: 'main-menu' // Add more like context-menu, command-palette, etc. as needed
}

export default abstract class WorkspaceCommand extends Command {

	readonly workspace: Workspace

	private _id: string

	constructor(workspace: Workspace, options?: CommandOptions) {
		super(options)
		this.workspace = workspace
	}
	
	get id () { return this._id }
	set id (id: string) {
		if (this._id) {
			console.error(`Attempted to give workspace command with an existing id of "${this._id}" a new id "${id}". Ids should only be set once.`)
		}
		this._id = id 
	}

	/** Describes the command in the context of shortcuts and debugging */
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
				context: this.getDefaultPaletteContext(),
				shortcuts: this.shortcuts
			}]
		}
		return []
	}

	protected getDefaultPaletteContext(): CommandContext {
		return {}
	}
}
