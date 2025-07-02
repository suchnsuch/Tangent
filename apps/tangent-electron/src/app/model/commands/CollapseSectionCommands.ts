import { getFirstCollapseableParentIndex } from 'common/markdownModel/sections'
import { NoteViewState } from '../nodeViewStates'
import { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import { rangeContainsRange } from 'common/typewriterUtils'
import { wait } from '@such-n-such/core'

export class CollapseCurrentSectionCommand extends WorkspaceCommand {

	getTargets() {
		const view = this.workspace.viewState.tangent.currentThreadState.value
		if (!view || !(view instanceof NoteViewState) || !view.editor) return null

		const editor = view.editor
		if (!view.selection.value) return null

		const index = getFirstCollapseableParentIndex(editor.doc, view.selection.value[0])
		if (index === undefined) return null

		return { view, editor, index }
	}

	canExecute(context?: CommandContext): boolean {
		return this.getTargets() != null
	}

	execute(context?: CommandContext): void {
		const targets = this.getTargets()
		if (targets) {
			const { view, editor, index } = targets
			editor.collapsingSections.toggleLineCollapsed(index)

			const lineRange = editor.doc.getLineRange(editor.doc.lines[index])
			if (!rangeContainsRange(lineRange, view.selection.value)) {
				wait().then(() => {
					editor.select(lineRange[1] - 1)
				})
			}
		}
	}

	getLabel(context?: CommandContext) {
		const targets = this.getTargets()
		if (targets) {
			if (targets.editor.collapsingSections.lineHasCollapsedChildren(targets.index)) {
				return 'Expand Current Section'
			}
			return 'Collapse Current Section'
		}
		return 'Toggle Current Section'
	}
}
