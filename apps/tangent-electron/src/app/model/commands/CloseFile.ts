import type Workspace from '../Workspace'
import type Tangent from '../Tangent'
import type { CommandContext, CommandOptions } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import type { TreeNode } from 'common/trees'

type CloseFileMode = 'current' | 'others' | 'left' | 'right'

interface CloseFileCommandContext extends CommandContext {
	node?: TreeNode
	tangent?: Tangent
	mode?: CloseFileMode
}

interface CloseFileCommandOptions extends CommandOptions {
	mode: CloseFileMode
}

export default class CloseFileCommand extends WorkspaceCommand {

	mode: CloseFileMode

	constructor(workspace: Workspace, options: CloseFileCommandOptions) {
		super(workspace, options)
		this.mode = options.mode

		this.workspace.viewState.tangent.currentNode.subscribe(v => this.alertDirty())
	}

	canExecute({ node, tangent, mode }: CloseFileCommandContext = {}): boolean {
		tangent = tangent || this.workspace.viewState.tangent
		node = node || tangent?.currentNode.value
		mode = mode || this.mode

		if (mode === 'current' && node && tangent) {
			return true
		}
		if (mode === 'others') {
			return tangent?.thread.value.length > 1
		}
		
		const index = tangent.thread.value.indexOf(node)
		if (mode === 'left') {
			return index > 0
		}
		if (mode === 'right') {
			return index >= 0 && index < tangent.thread.value.length - 1
		}

		return false
	}

	execute({ node, tangent, mode }: CloseFileCommandContext = {}) {
		tangent = tangent || this.workspace.viewState.tangent
		node = node || tangent?.currentNode.value
		mode = mode || this.mode
		
		const threadFiles = tangent.thread.value
		const index = threadFiles.indexOf(node)
		if (index >= 0) {
			const session = tangent.activeSession.value
			if (!session) {
				console.error('Cannot close files without an active session!')
				return
			}

			if (mode === 'others') {
				session.addThreadHistory({
					thread: [node],
					currentNode: node
				})
				return
			}

			const newFiles = threadFiles.slice()

			let nextFile = node

			switch (mode) {
				case 'current':
					newFiles.splice(index, 1)
					nextFile = index === threadFiles.length - 1 ?
						newFiles[newFiles.length - 1] :
						newFiles[index]
					break
				case 'left':
					newFiles.splice(0, index)
					break
				case 'right':
					newFiles.splice(index + 1)
					break
			}

			session.addThreadHistory({
				thread: newFiles,
				currentNode: nextFile
			})

			if (newFiles.length === 0 && this.workspace.settings.openMapWhenThreadEmptied.value) {
				this.workspace.commands.setMapFocusLevel.execute()
			}
		}
	}

	getLabel(context: CloseFileCommandContext) {
		return this.getModeDisplayName(context?.mode || this.mode)
	}

	getTooltip(context: CloseFileCommandContext) {
		switch (context?.mode ?? this.mode) {
			case 'current':
				return 'Close this file.'
			case 'others':
				return 'Close other files.'
			case 'left':
				return 'Close files to the left.'
			case 'right':
				return 'Close files to the right.'
		}
	}

	getDefaultPaletteName() {
		return this.getModeDisplayName(this.mode)
	}

	getModeDisplayName(mode: CloseFileMode) {
		switch (mode) {
			case 'current':
				return 'Close Current File'
			case 'others':
				return 'Close Other Files'
			case 'left':
				return 'Close Files to the Left'
			case 'right':
				return 'Close Files to the Right'
		}
	}
}
