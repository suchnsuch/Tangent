import type { TreeNode } from "common/trees";
import { derived } from 'svelte/store';
import type Tangent from "../Tangent";
import type Workspace from "../Workspace";
import type { CommandContext, CommandOptions } from "./Command";
import WorkspaceCommand from "./WorkspaceCommand";

type ChangeFileMode = 'left' | 'right'

interface ChangeFileCommandContext extends CommandContext {
	node?: TreeNode,
	tangent?: Tangent,
	mode?: ChangeFileMode
}

interface ChangeFileCommandOptions extends CommandOptions {
	mode: ChangeFileMode
}

export default class ChangeCurrentFileCommand extends WorkspaceCommand {

	mode: ChangeFileMode

	constructor(workspace: Workspace, options: ChangeFileCommandOptions) {
		super(workspace, options)
		this.mode = options.mode

		const tangent = this.workspace.viewState.tangent
		derived([tangent.currentNode, tangent.threadLenses], ([cn, lenses]) => {
			this.alertDirty()
		}).subscribe(_ => {})
	}
	
	canExecute({ node, tangent, mode}: ChangeFileCommandContext = {}) {
		tangent = tangent || this.workspace.viewState.tangent
		node = node || tangent?.currentNode.value
		mode = mode || this.mode

		const index = tangent.threadLenses.value.findIndex(l => l.parent.node === node)
		if (mode === 'left') {
			return index > 0
		}
		if (mode === 'right') {
			return index >= 0 && index < tangent.threadLenses.value.length - 1
		}
	}

	execute({ node, tangent, mode}: ChangeFileCommandContext = {}) {
		tangent = tangent || this.workspace.viewState.tangent
		node = node || tangent?.currentNode.value
		mode = mode || this.mode

		const threadLenses = tangent.threadLenses.value
		const index = threadLenses.findIndex(l => l.parent.node === node)
		let nextIndex = -1
		if (mode === 'left') {
			nextIndex = index - 1
		}
		else if (mode === 'right') {
			nextIndex = index + 1
		}

		if (nextIndex >= 0 && nextIndex < threadLenses.length) {
			tangent.updateThread({
				currentNode: threadLenses[nextIndex].parent.node,
				thread: 'retain'
			})
		}
	}

	getLabel(context: ChangeFileCommandContext) {
		switch (context?.mode ?? this.mode) {
			case 'left':
				return 'Move to Left Note'
			case 'right':
				return 'Move to Right Note'
		}
	}

	getTooltip(context: ChangeFileCommandContext) {
		switch (context?.mode ?? this.mode) {
			case 'left':
				return 'Shifts focus one pane to the left.'
			case 'right':
				return 'Shifts focus one pane to the right.'
		}
	}
}