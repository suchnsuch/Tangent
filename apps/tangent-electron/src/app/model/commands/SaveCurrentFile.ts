import { derived } from 'svelte/store';
import File from '../File';
import type Workspace from '../Workspace';
import type { CommandContext } from './Command';
import WorkspaceCommand from './WorkspaceCommand';

export default class SaveCurrentFileCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, { shortcut: 'Mod+S' })

		const tangent = this.workspace.viewState.tangent
		derived(tangent.currentNode, (node, set) => {
			this.alertDirty()
			if (node instanceof File) {
				return derived(node, n => {
					this.alertDirty()
				}).subscribe(set)
			}
		}).subscribe(_ => {})
	}

	canExecute(context: CommandContext): boolean {
		const node = this.workspace.viewState.tangent?.currentNode.value
		if (node instanceof File) {
			return node.isDirty
		}
		return false
	}

	execute(context: CommandContext): void {
		const node = this.workspace.viewState.tangent?.currentNode.value
		if (node instanceof File && node.isDirty) {
			node.saveFile()
		}
	}
}
