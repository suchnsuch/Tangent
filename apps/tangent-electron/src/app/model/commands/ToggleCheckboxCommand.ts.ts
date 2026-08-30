import { Tangent, Workspace } from '..'
import { NoteViewState } from '../nodeViewStates'
import type { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import { type EditorRange } from 'typewriter-editor'
import MarkdownEditor from 'app/views/editors/NoteEditor/MarkdownEditor'
import { toggleCheckbox } from 'app/views/editors/NoteEditor/editorActions'


function getNoteView(tangent: Tangent) {
	const view = tangent.getCurrentViewState()
	if (!view || !(view instanceof NoteViewState) || !view.editor) return null
	return view
}

interface ToggleCheckboxCommandContext extends CommandContext {
	view?: NoteViewState
	editor?: MarkdownEditor
	selection?: EditorRange

}

export class ToggleCheckboxCommand extends WorkspaceCommand {

	constructor(workspace: Workspace) {
		super(workspace, { group: 'Notes', shortcut: 'Mod+[' })
	}

	getTargets(context?: ToggleCheckboxCommandContext) {
		let editor = context?.editor
		let selection = context?.selection
		let view = context?.view
		
		if (!view) {
			view = getNoteView(this.workspace.viewState.tangent)
			if (!view || !(view.editor instanceof MarkdownEditor)) return null
		}

		if (!editor || !selection) {
			editor = editor || view.editor
			selection = selection || editor.doc.selection || view.selection.value
		}

		if (!view || !editor || !selection) return null

		return { view, editor, selection }
	}

	canExecute(context?: ToggleCheckboxCommandContext): boolean {
		return this.getTargets(context) != null
	}

	execute(context?: ToggleCheckboxCommandContext): void {
		const targets = this.getTargets(context)
		if (!targets) return
		const { editor, selection } = targets
		toggleCheckbox(editor, selection, {
			targetMark: this.workspace?.settings?.defaultTodoCompleteChar.value
		})
	}

	getLabel(context?: ToggleCheckboxCommandContext) {
		return "Toggle Checkbox"
	}

	getTooltip(context?: ToggleCheckboxCommandContext) {
		return "Turns lines into a checkbox and switches checkbox state between on and off."
	}

	getDefaultPaletteName() {
		return this.getName()
	}

	getName() {
		return `Toggle Checkbox`
	}
}
