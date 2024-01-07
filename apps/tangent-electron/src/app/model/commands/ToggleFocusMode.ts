import type { WritableStore } from 'common/stores'
import { FocusLevel } from 'common/dataTypes/TangentInfo'
import type { Workspace } from ".."
import type { CommandContext } from "./Command"
import SetFocusLevelCommand from './SetFocusLevel'

interface ToggleFocusModeCommandContext extends CommandContext {
	toggle?: boolean
}

// This exists to toggle between thread and the last positive
// focus mode the user invoked.
export default class ToggleFocusModeCommand extends SetFocusLevelCommand {

	targetFocusLevel: WritableStore<FocusLevel>

	constructor(workspace: Workspace) {
		super(workspace, { shortcut: 'Mod+D' })

		// TODO: This should be a setting
		this.targetFocusLevel = workspace.viewState.targetFocusModeLevel
	}

	onFocusLevelChanged(focusLevel: FocusLevel) {
		if (focusLevel > FocusLevel.Thread) {
			// TODO: Only update if settings are on 'auto'
			this.targetFocusLevel.set(focusLevel)
		}
		super.alertDirty()
	}

	canExecute(context: ToggleFocusModeCommandContext) {
		return super.canExecute(Object.assign(
			{},
			{
				targetFocusLevel: this.targetFocusLevel.value,
				toggle: true
			},
			context))
	}

	execute(context: ToggleFocusModeCommandContext) {
		let currentLevel = this.focusLevel.value
		let targetFocusLevel = this.targetFocusLevel.value

		let toggle = context?.toggle ?? true

		if (toggle && currentLevel > FocusLevel.Thread) {
			targetFocusLevel = FocusLevel.Thread
		}

		super.execute({
			targetFocusLevel: targetFocusLevel
		})
	}

	getChecked(_context) {
		return super.getChecked({
			targetFocusLevel: this.targetFocusLevel.value
		})
	}

	getTooltip(context: ToggleFocusModeCommandContext) {
		return super.getTooltip(Object.assign(
			{},
			{ targetFocusLevel: this.targetFocusLevel.value },
			context))
	}
}