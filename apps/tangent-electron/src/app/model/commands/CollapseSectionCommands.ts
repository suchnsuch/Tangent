import { compareSectionDepth, getFirstCollapseableParentIndex, isLineCollapsible } from 'common/markdownModel/sections'
import { NoteViewState } from '../nodeViewStates'
import { CommandContext, CommandOptions } from './Command'
import WorkspaceCommand, { WorkspaceCommandContext } from './WorkspaceCommand'
import type { Line } from '@typewriter/document'
import { Tangent, Workspace } from '..'
import { derived } from 'svelte/store'

function getNoteView(tangent: Tangent) {
	const view = tangent.getCurrentViewState()
	if (!view || !(view instanceof NoteViewState) || !view.editor) return null
	return view
}

export class CollapseCurrentSectionCommand extends WorkspaceCommand {

	constructor(workspace: Workspace, options: CommandOptions) {
		super(workspace, { group: 'Notes', ...options })

		derived(this.workspace.viewState.tangent.currentThreadState, (state, set) => {
			if (state instanceof NoteViewState) {
				return state.selection.subscribe(set)
			}
			else set(null)
		}).subscribe(_ => {
			this.alertDirty()
		})
	}

	getTargets() {
		const view = getNoteView(this.workspace.viewState.tangent)
		if (!view || !(view instanceof NoteViewState) || !view.editor) return null

		const editor = view.editor
		if (!view.selection.value) return null

		const index = getFirstCollapseableParentIndex(editor.doc, view.selection.value[0])
		if (index === undefined) return null

		return { editor, index }
	}

	canExecute(context?: WorkspaceCommandContext): boolean {
		return this.getTargets() != null
	}

	execute(context?: WorkspaceCommandContext): void {
		const targets = this.getTargets()
		if (targets) {
			const { editor, index } = targets
			editor.collapsingSections.toggleLineCollapsed(index)
		}
	}

	getName() {
		return 'Toggle Current Selection'
	}

	getLabel(context?: WorkspaceCommandContext) {
		const targets = this.getTargets()
		if (targets && context?.context !== 'main-menu') {
			if (targets.editor.collapsingSections.lineHasCollapsedChildren(targets.index)) {
				return 'Expand Current Section'
			}
			return 'Collapse Current Section'
		}
		return this.getName()
	}

	getTooltip(context?: WorkspaceCommandContext) {
		const targets = this.getTargets()
		if (targets && context?.context !== 'main-menu') {
			if (targets.editor.collapsingSections.lineHasCollapsedChildren(targets.index)) {
				return 'Expands the current note section, revealing hidden content.'
			}
			return 'Collapses the current note section, hiding its contents.'
		}
		return 'Toggles the current note section between collapsed & expanded.'
	}
}

export interface CollapseAllSectionsOptions extends CommandOptions {
	mode?: 'collapse'|'expand'
	scope?: 'all'|'edge'
}

export class CollapseAllSectionsCommand extends WorkspaceCommand {

	mode: 'collapse'|'expand'
	scope: 'all'|'edge'

	constructor(workspace: Workspace, options: CollapseAllSectionsOptions) {
		super(workspace, { group: 'Notes', ...options })

		this.scope = options?.scope ?? 'all'
		this.mode = options?.mode ?? 'collapse'

		derived(this.workspace.viewState.tangent.currentThreadState, (state, set) => {
			if (state instanceof NoteViewState) {
				return state.selection.subscribe(set)
			}
			else set(null)
		}).subscribe(_ => {
			this.alertDirty()
		})
	}

	getView() {
		return getNoteView(this.workspace.viewState.tangent)
	}

	canExecute(context?: CommandContext): boolean {
		const view = this.getView()
		if (!view) return false

		const doc = view.editor.doc
		const sections = view.editor.collapsingSections

		if (this.mode === 'collapse') {
			for (let i = 0; i < doc.lines.length; i++) {
				if (isLineCollapsible(doc.lines, i) && !sections.lineHasCollapsedChildren(i)) {
					return true
				}
			}
		}
		else if (this.mode === 'expand') {
			for (let i = 0; i < doc.lines.length; i++) {
				if (isLineCollapsible(doc.lines, i) && sections.lineHasCollapsedChildren(i)) {
					return true
				}
			}
		}

		return false
	}

	execute(context?: CommandContext): void {
		const view = this.getView()
		if (!view) return

		const doc = view.editor.doc
		const sections = view.editor.collapsingSections

		let baseLine: Line = null
		let targets: number[] = []

		for (let i = 0; i < doc.lines.length; i++) {
			const targetable = isLineCollapsible(doc.lines, i) &&
				(this.scope == 'all' || !sections.lineIsCollapsed(i)) &&
				(this.mode === 'collapse' 
					? !sections.lineHasCollapsedChildren(i)
					: sections.lineHasCollapsedChildren(i)
				)

			if (!targetable) continue

			if (!baseLine || this.scope === 'all') {
				baseLine = doc.lines[i]
				targets.push(i)
			}
			else {
				const line = doc.lines[i]
				const comparison = compareSectionDepth(baseLine, line)
				if (comparison === true) continue

				if (comparison === 0) {
					targets.push(i)
				}
				else if ((this.mode === 'collapse' && comparison < 0)
					|| (this.mode === 'expand' && comparison > 0)
				) {
					// Prefer collapsing lower tier sections
					// and expanding higher tier sections
					baseLine = line
					targets = [i]
				}
			}
		}

		sections.toggleLineCollapsed(targets)
	}

	getLabel(context?: CommandContext) {
		if (this.scope === 'all') {
			switch (this.mode) {
				case 'collapse':
					return 'Collapse All Sections'
				case 'expand':
					return 'Expand All Sections'
			}
		}
		else if (this.scope === 'edge') {
			switch (this.mode) {
				case 'collapse':
					return 'Collapse Smallest Sections'
				case 'expand':
					return 'Expand Largest Sections'
			} 
		}
	}

	getTooltip(context?: CommandContext) {
		if (this.scope === 'all') {
			switch (this.mode) {
				case 'collapse':
					return 'Collapses all sections within the current note, hiding their contents.'
				case 'expand':
					return 'Expands all sections within the current note, revealing their contents.'
			}
		}
		else if (this.scope === 'edge') {
			switch (this.mode) {
				case 'collapse':
					return 'Collapses the lowest-tier, visible sections of the note.'
				case 'expand':
					return 'Expands the highest-tier, collapsed sections of the note.'
			} 
		}
	}
}
