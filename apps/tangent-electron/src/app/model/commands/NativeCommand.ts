import MarkdownEditor from 'app/views/editors/NoteEditor/MarkdownEditor'
import { Workspace } from '..'
import type { CommandContext, CommandOptions } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import type { EditorRange } from '@typewriter/document'

type NativeCommandRole = 'cut' | 'copy' | 'paste' | 'pasteAndMatchStyle' | 'selectAll' | 'undo' | 'redo'

interface NativeCommandOptions extends CommandOptions {
	role: NativeCommandRole
	label: string
	tooltip: string
}

interface NativeCommandContext extends CommandContext {
	editor?: MarkdownEditor
	selection?: EditorRange
}

export class NativeCommand extends WorkspaceCommand {
	role: NativeCommandRole
	label: string
	tooltip: string
	
	constructor(workspace: Workspace, options: NativeCommandOptions) {
		super(workspace, options)
		this.role = options.role
		this.label = options.label
		this.tooltip = options.tooltip
	}

	execute(context?: NativeCommandContext): void {
		if (context?.editor) {
			// Bypass these with direct actions
			// This fixes a strange bug where undo after a 'cut' on initialization doesn't trigger the expected `InputEvent`
			// Solid argument that this should be a subclass, but we'll cross that bridge if necessary.
			switch (this.role) {
				case 'undo':
					context.editor.modules.history.undo()
					return
				case 'redo':
					context.editor.modules.history.redo()
					return
			}
		}
		this.workspace.api.edit.nativeAction(this.role)
	}

	getLabel(context?: NativeCommandContext) {
		return this.label
	}

	getTooltip(context?: NativeCommandContext) {
		return this.tooltip
	}

	getDefaultPaletteName() {
		return null // Disable the palette for these
	}
}
