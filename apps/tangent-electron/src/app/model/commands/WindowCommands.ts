import { wait } from '@such-n-such/core';
import type { Workspace } from "..";
import type { CommandContext, CommandOptions } from "./Command";
import WorkspaceCommand from "./WorkspaceCommand";

interface FloatWindowCommandContext extends CommandContext {
	float?: boolean
}

export class FloatWindowCommand extends WorkspaceCommand {

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

interface FullscreenWindowCommandContext extends CommandContext {
	fullscreen?: boolean
}

export class FullscreenWindowCommand extends WorkspaceCommand {

	isFullscreen = false

	constructor(workspace: Workspace, options?: CommandOptions) {
		super(workspace, options)

		this.queryFullscreenState()
	}

	queryFullscreenState() {
		this.workspace.api.window.isFullscreen().then(value => {
			this.isFullscreen = value
			this.alertDirty()
		})
	}

	canExecute(context?: FullscreenWindowCommandContext) {
		const wantsToFloat = context?.fullscreen ?? !this.isFullscreen
		return wantsToFloat !== this.isFullscreen
	}

	execute(context?: FullscreenWindowCommandContext): void {
		const wantsToFullscreen = context?.fullscreen ?? !this.isFullscreen
		if (wantsToFullscreen !== this.isFullscreen) {
			this.workspace.api.window.setFullscreen(wantsToFullscreen)
			// Delay so that any fullscreen transition has a chance to complete
			wait(500).then(() => this.queryFullscreenState())
		}
	}

	getLabel(context: CommandContext) {
		return 'Fullscreen Window'
	}

	getTooltip(context: CommandContext) {
		return 'Toggles whether this window is fullscreen.'
	}

	getChecked() {
		return this.isFullscreen
	}
}
