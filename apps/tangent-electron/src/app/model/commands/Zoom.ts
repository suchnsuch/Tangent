import { derived } from 'svelte/store'
import type Setting from 'common/settings/Setting'
import { FocusLevel } from 'common/dataTypes/TangentInfo'
import { ImageViewState } from '../nodeViewStates'
import type Workspace from '../Workspace'
import type { CommandContext, CommandOptions } from './Command'
import WorkspaceCommand from './WorkspaceCommand'

export interface ZoomCommandOptions extends CommandOptions {
	direction: -1 | 1 | 'reset'
}

const zoomSteps = [
	.1, .15, .25, .5, .75, 1,
	1.25, 1.5, 2, 3, 4, 5, 8, 10
]

export default class ZoomCommand extends WorkspaceCommand {

	options: ZoomCommandOptions

	constructor(workspace: Workspace, options: ZoomCommandOptions) {
		super(workspace, options)
		this.options = options

		let dirtyAlert = v => this.alertDirty()

		const tangent = this.workspace.viewState.tangent

		derived([tangent.focusLevel,tangent.currentNode], ([fl, cn], set) => {
			return this.getZoomSetting().subscribe(set)
		}).subscribe(dirtyAlert)
	}

	getZoomSetting(): Setting<number> {
		// Default to text size
		const tangent = this.workspace.viewState.tangent

		if (tangent.focusLevel.value === FocusLevel.Map) {
			return tangent.tangentInfo.value.zoom
		}
		else {
			const nodeState = tangent.context.getState(tangent.currentNode.value, false)
			if (nodeState) {
				
				// TODO: Some way for states to handle this themselves
				if (nodeState instanceof ImageViewState) {
					return nodeState.zoom
				}
			}
		}
		return this.workspace.settings.noteFontSize
	}

	canExecute(context: CommandContext) {
		// Default to text size
		const zoom = this.getZoomSetting()

		const direction = this.options.direction

		if (direction === 'reset') {
			return zoom.value !== zoom.defaultValue
		}

		const range = zoom.range
		const value = zoom.value
		return direction < 0 && range.min < value
			|| direction > 0 && range.max > value
	}

	execute(context: CommandContext) {
		const zoom = this.getZoomSetting()
		const direction = this.options.direction
		let value = zoom.value

		if (direction === 'reset') {
			value = zoom.defaultValue
		}
		else {
			const step = zoom.range.step

			if (step == undefined) {
				for (let i = 1; i < zoomSteps.length; i++) {
					const low = zoomSteps[i - 1]
					const high = zoomSteps[i]

					if (direction > 0) {
						if (value >= low && value < high) {
							value = high
							break
						}
					}
					else {
						if (value > low && value <= high) {
							value = low
							break
						}
					}
				}
			}
			else {
				value += step * direction
			}
		}

		zoom.set(value)
	}

	getLabel(context: CommandContext) {
		switch (this.options.direction) {
			case -1:
				return 'Zoom Out'
			case 1:
				return 'Zoom In'
			case 'reset':
				return 'Reset Zoom'
		}
	}

	getTooltip(context: CommandContext) {
		switch (this.options.direction) {
			case -1:
				return 'Contextually zooms out or makes text smaller.'
			case 1:
				return 'Contextually zooms in or makes text bigger.'
			case 'reset':
				return 'Resets zoom to the default.'
		}
	}
}
