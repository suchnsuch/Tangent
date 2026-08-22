import { Tangent, Workspace } from '..'
import { NoteViewState } from '../nodeViewStates'
import type { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import { normalizeRange, type Editor, type EditorRange } from 'typewriter-editor'
import MarkdownEditor from 'app/views/editors/NoteEditor/MarkdownEditor'
import { listMatcher } from 'common/markdownModel/list'


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


export function toggleToDo(editor: Editor, selection: EditorRange,  mark: string) {
	const { doc } = editor
	const target = normalizeRange(selection)
	const [cursor, _] = target
	const change = editor.change

	for (const lineRange of doc.getLineRanges(target)) {
		const [lineStart, lineEnd] = lineRange

		if (lineStart <= cursor && cursor <= lineEnd){
			const line = doc.getText(lineRange)
			const match = line.match(listMatcher)

			if (match) {
				// Index of the first group (the checkbox state)
				const checkBoxStr = match[8]
				const checkBoxStart = match.index + match[0].indexOf(checkBoxStr)
				const head = lineStart + checkBoxStart
				const tail = head + checkBoxStr.length
				const cursor = tail - 2
				const checkBoxInside = doc.getText([cursor, cursor+1])

				// console.log(match)
				// console.log(cursor, [head, tail], checkBoxInside)

				if (checkBoxInside != '['){ // e.g. a checkbox that does not have anything in it like [] 
					change.delete([cursor, cursor+1])
				}
				change.insert(cursor+1, checkBoxInside == mark ? ' ' : mark)
			}

			break
		}
	}

	change.apply()
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
		const mark = this.workspace?.settings?.defaultTodoCompleteChar || 'x'
		toggleToDo(editor, selection, 'x')
	}

	getLabel(context?: ToDoToggleCommandContext) {
		return "Label"
	}

	getTooltip(context?: ToDoToggleCommandContext) {
		return "Tooltip"
	}

	getDefaultPaletteName() {
		return this.getName()
	}

	getName() {
		return `toggle ToDo`
	}
}
