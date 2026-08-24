import { Tangent, Workspace } from '..'
import { NoteViewState } from '../nodeViewStates'
import type { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import { type EditorRange } from 'typewriter-editor'
import MarkdownEditor from 'app/views/editors/NoteEditor/MarkdownEditor'
import { toggleToDo } from 'app/views/editors/NoteEditor/editorActions'


function getNoteView(tangent: Tangent) {
	const view = tangent.getCurrentViewState()
	if (!view || !(view instanceof NoteViewState) || !view.editor) return null
	return view
}

interface ToDoToggleCommandContext extends CommandContext {
	view?: NoteViewState
	editor?: MarkdownEditor
	selection?: EditorRange

}

export class ToggleToDoCheckbox extends WorkspaceCommand {

	constructor(workspace: Workspace) {
		super(workspace, { group: 'Notes' })
	}

	getTargets(context?: ToDoToggleCommandContext) {
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

	canExecute(context?: ToDoToggleCommandContext): boolean {
		return this.getTargets(context) != null
	}

	execute(context?: ToDoToggleCommandContext): void {
		const targets = this.getTargets(context)
		if (!targets) return
		const { editor, selection } = targets
		const mark = this.workspace?.settings?.defaultTodoCompleteChar.value
		toggleToDo(editor, selection, mark)
	}

	getLabel(context?: ToDoToggleCommandContext) {
		return "Switch Checkbox State"
	}

	getTooltip(context?: ToDoToggleCommandContext) {
		return "Switches checkbox state on <-> off"
	}

	getDefaultPaletteName() {
		return this.getName()
	}

	getName() {
		return `toggle ToDo`
	}
}
