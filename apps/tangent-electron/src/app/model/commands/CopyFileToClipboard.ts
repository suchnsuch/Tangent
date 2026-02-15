import { getEmbedDisplayname } from 'common/embedding'
import EmbedFile from '../EmbedFile'
import type { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import type { Workspace } from '..'

interface CopyFileToClipboardCommandContext extends CommandContext {
	file?: EmbedFile
}

export class CopyFileToClipboardCommand extends WorkspaceCommand {

	resolveFile(context?: CopyFileToClipboardCommandContext) {
		const node = context?.file ?? this.workspace.viewState.tangent.currentNode.value
		if (node instanceof EmbedFile) {
			return node
		}
	}

	canExecute(context?: CopyFileToClipboardCommandContext): boolean {
		return this.resolveFile(context)?.canCopyToClipboard()
	}

	execute(context?: CopyFileToClipboardCommandContext): void {
		this.resolveFile(context)?.copyToClipboard()
	}

	getName() {
		return 'Copy File To Clipboard'
	}

	getLabel(context?: CopyFileToClipboardCommandContext) {
		const file = this.resolveFile(context)
		if (!file) return this.getName()
		return `Copy ${getEmbedDisplayname(file.embedType)} to Clipboard`
	}

	getTooltip(context?: CopyFileToClipboardCommandContext) {
		const file = this.resolveFile(context)
		if (!file) return this.getName()
		return `Copies "${file.name}" to the clipboard`
	}
}

export class UpdateFileFromClipboardCommand extends WorkspaceCommand {
	resolveFile(context?: CopyFileToClipboardCommandContext) {
		const node = context?.file ?? this.workspace.viewState.tangent.currentNode.value
		if (node instanceof EmbedFile) {
			return node
		}
	}

	canExecute(context?: CopyFileToClipboardCommandContext): boolean {
		return this.resolveFile(context)?.canCopyToClipboard()
	}

	execute(context?: CopyFileToClipboardCommandContext): void {
		this.resolveFile(context)?.updateFromClipboard()
	}

	getName() {
		return 'Update File from Clipboard'
	}

	getLabel(context?: CopyFileToClipboardCommandContext) {
		const file = this.resolveFile(context)
		if (!file) return this.getName()
		return `Update ${getEmbedDisplayname(file.embedType)} from Clipboard`
	}

	getTooltip(context?: CopyFileToClipboardCommandContext) {
		const file = this.resolveFile(context)
		if (!file) return this.getName()
		return `Updates "${file.name}" with the current contents of the clipboard.`
	}
}
