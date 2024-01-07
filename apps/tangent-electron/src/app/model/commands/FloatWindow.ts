import type { Workspace } from "..";
import type { CommandContext, CommandOptions } from "./Command";
import WorkspaceCommand from "./WorkspaceCommand";

interface FloatWindowCommandContext extends CommandContext {
	float?: boolean
}

export default class FloatWindowCommand extends WorkspaceCommand {

	isFloating = false

	constructor(workspace: Workspace, options?: CommandOptions) {
		super(workspace, options)

		this.queryFloatingState()
	}

	queryFloatingState() {
		this.workspace.api.window.isAlwaysOnTop().then(value => {
			this.isFloating = value
			this.alertDirty()
		})
	}

	canExecute(context?: FloatWindowCommandContext) {
		const wantsToFloat = context?.float ?? !this.isFloating
		return wantsToFloat !== this.isFloating
	}

	execute(context?: FloatWindowCommandContext): void {
		const wantsToFloat = context?.float ?? !this.isFloating
		if (wantsToFloat !== this.isFloating) {
			this.workspace.api.window.setAlwaysOnTop(wantsToFloat)
			this.isFloating = wantsToFloat
			this.queryFloatingState()
		}
	}

	getLabel(context: CommandContext) {
		return 'Float Window'
	}

	getTooltip(context: CommandContext) {
		return 'Toggles whether this window floats over other windows.'
	}

	getChecked() {
		return this.isFloating
	}
}
