import { defaultModules, Editor, type EditorOptions, Delta, type EditorRange, Source } from "typewriter-editor"

import htmlToMarkdown from '@such-n-such/tangent-html-to-markdown'
import editorModule from './editorModule'
import autocompleteBuilder, { AutocompleteModule }  from '../autocomplete/autocompleteModule'
import NoteTypes from 'common/markdownModel/typewriterTypes'
import WikiLinkAutocompleter from '../autocomplete/WikiLinkAutocompleter'
import type { Workspace } from 'app/model'
import { getLineFormattingPrefix } from 'common/markdownModel/line'
import tlinkModule from '../t-linkModule'
import tCheckboxModule from '../t-checkboxModule'
import TagAutocompleter from '../autocomplete/TagAutocompleter'
import { getRegexMatchIndices } from '@such-n-such/core'
import UnicodeAutocompleter from '../autocomplete/UnicodeAutocompleter'
import CodeBlockAutocompleter from '../autocomplete/CodeBlockAutoCompleter'
import autoWrapping from '../autobraces/autoWrappingModule'
import { collapsingSections, type CollapsingSectionsModule } from './collapsingSections'
import TemplateTokenAutocompleter from "../autocomplete/TemplateTokenAutocompleter"

function indentLines(editor: MarkdownEditor, direction: -1 | 1) {
	const { doc } = editor
	const { selection } = doc

	if (!selection) return
	const change = editor.change

	const lines = doc.getLinesAt(selection)
	const [at, to] = selection

	if (direction === 1 && lines.length === 1 && at === to) {
		const line = lines[0]
		const [start, end] = doc.getLineRange(line)

		const prefix = getLineFormattingPrefix(line)
		const trimmedPrefix = prefix.trimEnd()

		if (at <= start + prefix.length && at >= start + trimmedPrefix.length) {
			change.insert(start, '\t')
			change.select(at + 1)
		}
		else {
			change.insert(at, '\t')
		}
	}
	else {
		const ranges = doc.getLineRanges(selection)
		let startOffset = 0
		let endOffset = 0

		for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
			const range = ranges[rangeIndex]
			if (direction === 1) {
				change.insert(range[0], '\t')
				if (rangeIndex === 0) startOffset += 1
				endOffset += 1
			}
			else if (direction === -1) {
				let text = doc.getText(range)
				if (text.startsWith('\t')) {
					change.delete([range[0], range[0] + 1])
					if (rangeIndex === 0) startOffset -= 1
					endOffset -= 1
				}
			}
		}
		change.select([selection[0] + startOffset, selection[1] + endOffset])
	}

	editor.update(change)
}

function htmlToMarkdownDelta(editor: Editor, html: string) {
	const delta = new Delta()

	const result = htmlToMarkdown(html)

	if (result.includes('\n')) {
		const lines = result.split('\n')
		lines.forEach((line, i) => {
			if (i) delta.insert('\n');
			if (line.length) delta.insert(line);
		});
	}
	else {
		delta.insert(result)
	}

	return delta
}

function getCopyRange(editor: Editor, event: ClipboardEvent): EditorRange {
	const doc = editor.doc
	const selection = doc.selection
	if (!selection) return selection

	const [start, end] = selection
	if (start !== end) return selection
	
	// Grab the entire line (except indent)
	const lineRange = doc.getLineRange(start)
	const lineText = doc.getText(lineRange)
	
	const match = lineText.match(/^\s*(.*)/d)
	if (!match) return selection
	const [from, to] = getRegexMatchIndices(match)[1]

	return [from + lineRange[0], to + lineRange[0]]
}

interface MarkdownEditorOptions extends EditorOptions {
	includeAutocomplete?: boolean
}

export default class MarkdownEditor extends Editor {

	readonly workspace?: Workspace

	constructor(workspace: Workspace, options?: MarkdownEditorOptions) {

		options = options || {}

		if (!options.types) {
			options.types = NoteTypes
		}

		if (!options.modules) {

			const {
				copy,
				paste,
				history,
				... trimmedDefaultModules
			} = defaultModules

			const newHistory = editor => {
				const result = history(editor)
				// We handle our own shortcuts. See `NativeCommand`.
				delete result.shortcuts
				return result
			}

			options.modules = {
				autocomplete: (workspace && (options?.includeAutocomplete ?? true)) ? autocompleteBuilder([
					new WikiLinkAutocompleter(workspace),
					new TagAutocompleter(workspace),
					new UnicodeAutocompleter(workspace),
					new CodeBlockAutocompleter(),
					new TemplateTokenAutocompleter()
				]) : null,

				...trimmedDefaultModules,
				history: newHistory,

				tLink: editor => tlinkModule(editor, {
					linkFollowRequirement: workspace?.settings?.noteLinkFollowBehavior as any ?? 'mod'
				}),
				tCheckbox: tCheckboxModule,
				autoWrap: autoWrapping,
				// This goes before copy/paste to get priority over those events
				tangent: editor => editorModule(editor, { workspace }),
				// After the main pass so that on-edit-uncollapse occurs after markdown reparse
				collapsingSections,
				
				copy: editor => copy(editor, {
					copyHTML: false,
					copyPlainText: true,
					getCopyRange
				}),
				paste: editor => paste(editor, { htmlParser: htmlToMarkdownDelta })
			}

			// Prevent key ordering destruction
			options.includeDefaultModules = false
		}

		super(options)

		this.workspace = workspace
	}

	indent(): this {
		indentLines(this, 1)
		return this
	}

	outdent(): this {
		indentLines(this, -1)
		return this
	}

	select(at: number | EditorRange, source?: Source): this {
		if (this.modules.input.isComposing()) {
			return this
		}
		return super.select(at, source)
	}

	get mainModule() { return this.modules.tangent as ReturnType<typeof editorModule> }
	get collapsingSections() { return this.modules.collapsingSections as CollapsingSectionsModule }
	get autocomplete() { return this.modules.autocomplete as AutocompleteModule }
}
