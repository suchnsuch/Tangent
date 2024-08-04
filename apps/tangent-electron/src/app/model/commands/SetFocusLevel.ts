import { SidebarMode } from "common/SidebarState"
import { FocusLevel } from 'common/dataTypes/TangentInfo'
import type { Workspace } from ".."
import type { CommandContext, CommandOptions } from "./Command"
import WorkspaceCommand from "./WorkspaceCommand"

interface FocusModeCommandContext extends CommandContext {
	targetFocusLevel?: FocusLevel
	toggle?: boolean
}

interface FocusModeCommandOptions extends CommandOptions, FocusModeCommandContext {

}

const constContext: FocusModeCommandContext = {
	targetFocusLevel: FocusLevel.File,
	toggle: false
}

export default class SetFocusLevelCommand extends WorkspaceCommand {

	defaultContext: FocusModeCommandContext
	isPaletteSource: boolean

	constructor(workspace: Workspace, defaultContext?: FocusModeCommandOptions, paletteSource = false) {
		super(workspace, defaultContext)

		this.defaultContext = defaultContext || constContext
		this.isPaletteSource = paletteSource

		this.workspace.viewState.tangent.focusLevel.subscribe(fl => {
			this.onFocusLevelChanged(fl)
		})
	}
	
	get focusLevel() {
		return this.workspace.viewState.tangent.focusLevel
	}

	protected onFocusLevelChanged(focusLevel: FocusLevel) {
		this.alertDirty()
	}

	private getApparentContext(context: FocusModeCommandContext) {
		return Object.assign({}, this.defaultContext, context ?? {}) as FocusModeCommandContext
	}

	canExecute(context: FocusModeCommandContext) {
		let { targetFocusLevel, toggle } = this.getApparentContext(context)

		if (targetFocusLevel >= FocusLevel.File) {
			const currentNode = this.workspace.viewState.tangent.currentNode.value
			if (!currentNode) {
				return false
			}
		}

		if (toggle) {
			return true
		}

		return this.focusLevel.value != targetFocusLevel
	}

	execute(context?: FocusModeCommandContext) {
		let { targetFocusLevel, toggle } = this.getApparentContext(context)

		const currentLevel = this.focusLevel.value

		if (toggle) {
			if (currentLevel === targetFocusLevel) {
				// Toggling Thread level is not supported
				targetFocusLevel = FocusLevel.Thread
			}
		}

		let sidebar = this.workspace.viewState.leftSidebar
		if (currentLevel <= FocusLevel.Thread) {
			sidebar.lastUnfocusedMode.set(sidebar.mode.value)
		}
		else {
			sidebar.lastFocusedMode.set(sidebar.mode.value)
		}

		const currentSidebarMode = sidebar.mode.value

		if (currentLevel > FocusLevel.Thread && targetFocusLevel <= FocusLevel.Thread) {
			// Moving out of focus mode
			const lastUnfocusedMode = sidebar.lastUnfocusedMode.value
			if (lastUnfocusedMode > currentSidebarMode) {
				sidebar.mode.set(lastUnfocusedMode)
			}
		}
		if (currentLevel <= FocusLevel.Thread && targetFocusLevel > FocusLevel.Thread) {
			// Moving into focus
			const lastFocusedMode = sidebar.lastFocusedMode.value
			if (lastFocusedMode < currentSidebarMode) {
				sidebar.mode.set(SidebarMode.closed)
			}
		}
		
		this.focusLevel.set(targetFocusLevel)
	}

	getChecked(context: FocusModeCommandContext) {
		let { targetFocusLevel } = this.getApparentContext(context)
		if (targetFocusLevel !== undefined) {
			return this.focusLevel.value === targetFocusLevel
		}
		return this.focusLevel.value > FocusLevel.Thread
	}

	getTooltip(context: FocusModeCommandContext) {
		let { targetFocusLevel, toggle } = this.getApparentContext(context)
		return `${toggle ? 'Toggles' : 'Switches to'} ${FocusLevel.getFullName(targetFocusLevel, false)}.`
	}

	getLabel(context: FocusModeCommandContext) {
		let { targetFocusLevel, toggle } = this.getApparentContext(context)
		return `${toggle ? 'Toggle' : 'Set to'} ${FocusLevel.getFullName(targetFocusLevel)}`
	}

	getPaletteActions() {
		if (!this.isPaletteSource) {
			return []
		}
		return [
			{
				name: 'Exit Focus',
				command: this,
				context: {
					targetFocusLevel: FocusLevel.Thread
				}
			},
			{
				name: 'Show Thread View',
				command: this,
				context: {
					targetFocusLevel: FocusLevel.Thread
				}
			},
			{
				name: 'Show Map View',
				command: this,
				context: {
					targetFocusLevel: FocusLevel.Map
				}
			},
			{
				name: 'Enter File Focus',
				command: this,
				context: {
					targetFocusLevel: FocusLevel.File
				}
			},
			{
				name: 'Enter Typewriter Focus',
				command: this,
				context: {
					targetFocusLevel: FocusLevel.Typewriter
				}
			},
			{
				name: 'Enter Paragraph Focus',
				command: this,
				context: {
					targetFocusLevel: FocusLevel.Paragraph
				}
			},
			{
				name: 'Enter Line Focus',
				command: this,
				context: {
					targetFocusLevel: FocusLevel.Line
				}
			},
			{
				name: 'Enter Sentence Focus',
				command: this,
				context: {
					targetFocusLevel: FocusLevel.Sentence
				}
			}
		]
	}
}
