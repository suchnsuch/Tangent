import { AttributePredicate } from 'common/typewriterUtils'
import { Tangent, Workspace } from '..'
import { NoteViewState } from '../nodeViewStates'
import { CommandContext, CommandOptions } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import { setLinePrefix, shiftGroup, toggleInlineFormat, toggleLink, toggleWikiLink } from 'app/views/editors/NoteEditor/editorActions'
import { EditorRange } from 'typewriter-editor'
import MarkdownEditor from 'app/views/editors/NoteEditor/MarkdownEditor'
import { HrefFormedLink } from 'common/indexing/indexTypes'
import { getLineFormattingPrefix } from 'common/markdownModel/line'
import { derived } from 'svelte/store'

function getNoteView(tangent: Tangent) {
	const view = tangent.getCurrentViewState()
	if (!view || !(view instanceof NoteViewState) || !view.editor) return null
	return view
}

interface InlineFormatCommandOptions extends CommandOptions {
	label: string
	tooltip: string
	formattingCharacters: () => string
	attributePredicate: AttributePredicate
}

interface NoteEditorCommandContext extends CommandContext {
	editor?: MarkdownEditor
	selection?: EditorRange
}

interface InlineFormatCommandContext extends NoteEditorCommandContext {
}

class NoteEditorCommand extends WorkspaceCommand {

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

	getTargets(context?: NoteEditorCommandContext) {
		let editor = context?.editor
		let selection = context?.selection

		if (!editor || !selection) {
			const view = getNoteView(this.workspace.viewState.tangent)
			if (!view || !(view.editor instanceof MarkdownEditor)) return null
			
			editor = editor || view.editor
			selection = selection || editor.doc.selection || view.selection.value
		}

		if (!editor || !selection) return null

		return { editor, selection }
	}
}

export class InlineFormatCommand extends NoteEditorCommand {

	readonly label: string
	readonly tooltip: string
	readonly formattingCharacters: () => string
	readonly attributePredicate: AttributePredicate

	constructor(workspace: Workspace, options: InlineFormatCommandOptions) {
		super(workspace, options)

		this.label = options.label
		this.tooltip = options.tooltip
		this.formattingCharacters = options.formattingCharacters
		this.attributePredicate = options.attributePredicate
	}

	canExecute(context?: InlineFormatCommandContext): boolean {
		return this.getTargets(context) != null
	}

	execute(context?: InlineFormatCommandContext): void {
		const targets = this.getTargets(context)
		if (!targets) return
		const { editor, selection } = targets

		toggleInlineFormat(editor, selection, this.formattingCharacters(), this.attributePredicate, context?.initiatingEvent)
	}

	getChecked(context?: InlineFormatCommandContext): boolean | null {
		const targets = this.getTargets(context)
		if (!targets) return null
		const { editor, selection } = targets
		return this.attributePredicate(editor.doc.getFormats(selection)) != null
	}

	getLabel(context?: InlineFormatCommandContext) {
		return this.label
	}

	getTooltip(context?: InlineFormatCommandContext) {
		return this.tooltip
	}

	getDefaultPaletteName() {
		return this.getName()
	}

	getName() {
		return `Toggle ${this.label}`
	}
}

type ToggleWikiLinkMode = 'name'|'display'
interface ToggleWikiLinkCommandOptions extends CommandOptions {
	mode: ToggleWikiLinkMode
}

interface ToggleWikiLinkCommandContext extends NoteEditorCommandContext {
}

export class ToggleWikiLinkCommand extends NoteEditorCommand {

	mode: ToggleWikiLinkMode

	constructor(workspace: Workspace, options: ToggleWikiLinkCommandOptions) {
		super(workspace, options)
		this.mode = options.mode
	}

	canExecute(context?: ToggleWikiLinkCommandContext): boolean {
		return this.getTargets(context) != null
	}

	execute(context?: ToggleWikiLinkCommandContext): void {
		const targets = this.getTargets(context)
		if (!targets) return
		const { editor, selection } = targets

		toggleWikiLink(editor, selection, this.mode, context?.initiatingEvent)
	}

	getChecked(context?: ToggleWikiLinkCommandContext): boolean | null {
		const targets = this.getTargets(context)
		if (!targets) return null
		const { editor, selection } = targets
		const link = editor.doc.getFormats(selection)?.t_link as HrefFormedLink
		return link?.form === 'wiki'
	}

	getName() {
		if (this.mode === 'name') {
			return 'Toggle Wiki Link'
		}
		return 'Make Wiki Link From Text'
	}

	getLabel(context?: ToggleWikiLinkCommandContext) {
		if (this.mode === 'name') {
			return 'Wiki Link'
		}
		return 'Wiki Link From Text'
	}

	getTooltip(context?: ToggleWikiLinkCommandContext) {
		const checked = this.getChecked(context)
		if (checked) {
			return 'Removes the selected wiki link.'
		}
		if (this.mode === 'name') {
			return 'Creates a wiki link from the selected text.'
		}
		return 'Creates a wiki link using the selected text as the display text.'
	}

	getDefaultPaletteName() {
		return this.getName()
	}
}

export class ToggleMDLinkCommand extends NoteEditorCommand {
	canExecute(context?: NoteEditorCommandContext): boolean {
		return this.getTargets(context) != null
	}

	execute(context?: NoteEditorCommandContext): void {
		const targets = this.getTargets(context)
		if (!targets) return
		const { editor, selection } = targets
		toggleLink(editor, selection, context?.initiatingEvent)
	}

	getChecked(context?: NoteEditorCommandContext): boolean | null {
		const targets = this.getTargets(context)
		if (!targets) return null
		const { editor, selection } = targets
		const link = editor.doc.getFormats(selection)?.t_link as HrefFormedLink
		return link?.form === 'md'
	}

	getName() {
		return 'Toggle Markdown Link'
	}

	getLabel(context?: NoteEditorCommandContext) {
		return 'Markdown Link'
	}

	getTooltip(context?: NoteEditorCommandContext) {
		if (this.getChecked(context)) {
			return 'Removes the selected markdown link.'
		}
		return 'Creates a new markdown link from the selection. Injects any links from the clipboard if present.'
	}

	getDefaultPaletteName() {
		return this.getName()
	}
}

interface NoteLinePrefixCommandOptions extends CommandOptions {
	label: string
	tooltip: string
	prefix: string
}

export class NoteLinePrefixCommand extends NoteEditorCommand {
	label: string
	tooltip: string
	prefix: string

	constructor(workspace: Workspace, options: NoteLinePrefixCommandOptions) {
		super(workspace, options)
		this.label = options.label
		this.tooltip = options.tooltip
		this.prefix = options.prefix
	}

	canExecute(context?: NoteEditorCommandContext): boolean {
		return this.getTargets(context) != null
	}

	execute(context?: NoteEditorCommandContext): void {
		const targets = this.getTargets(context)
		if (!targets) return
		const { editor, selection } = targets

		setLinePrefix(editor, selection, this.prefix, context?.initiatingEvent)
	}

	getChecked(context?: NoteEditorCommandContext): boolean | null {
		const targets = this.getTargets(context)
		if (!targets) return
		const { editor, selection } = targets
		const lines = editor.doc.getLinesAt(selection)
		return lines.every(line => getLineFormattingPrefix(line) === this.prefix)
	}

	getName() {
		return 'Set ' + this.label
	}

	getLabel(context?: NoteEditorCommandContext) {
		return this.label
	}

	getTooltip(context?: NoteEditorCommandContext) {
		return this.tooltip
	}

	getDefaultPaletteName() {
		return this.getName()
	}
}

type ShiftNoteGroupCommandMode = 'lines'|'section'
interface ShiftNoteGroupCommandOptions extends CommandOptions {
	direction: -1|1
	mode: ShiftNoteGroupCommandMode
}

export class ShiftNoteGroupCommand extends NoteEditorCommand {
	direction: -1|1
	mode: ShiftNoteGroupCommandMode

	constructor(workspace: Workspace, options: ShiftNoteGroupCommandOptions) {
		super(workspace, { group: 'Notes', ...options })

		this.direction = options.direction
		this.mode = options.mode
	}

	canExecute(context?: NoteEditorCommandContext): boolean {
		return this.getTargets(context) != null
	}

	execute(context?: NoteEditorCommandContext): void {
		const targets = this.getTargets(context)
		if (!targets) return
		const { editor, selection } = targets
		shiftGroup(editor, selection, context?.initiatingEvent, this.mode, this.direction)
	}

	getModeLabel() {
		if (this.mode === 'lines') {
			return 'Lines'
		}
		return 'Section'
	}

	getName() {
		return `Shift ${this.getModeLabel()} ${this.direction < 0 ? 'Up' : 'Down'}`
	}

	getLabel(context?: NoteEditorCommandContext) {
		return this.getName()
	}

	getTooltip(context?: CommandContext) {
		return `Shifts the selected ${this.mode} ${this.direction < 0 ? 'up' : 'down'} by one step.`
	}

	getDefaultPaletteName() {
		return this.getName()
	}
}
