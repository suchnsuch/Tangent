import { Editor, type EditorOptions } from 'typewriter-editor'
import { copy } from 'typewriter-editor'

import NoteTypes from 'common/markdownModel/typewriterTypes'
import type { Workspace } from 'app/model'
import editorModule from "./editorModule"
import tlinkModule from '../t-linkModule'

export interface MarkdownViewOptions extends EditorOptions {
	workspace?: Workspace
	filepath?: string
} 

/**
 * A typewriter-editor Editor intended to be a read-only view of markdown content
 */
export default class MarkdownView extends Editor {
	constructor(options?: MarkdownViewOptions) {
		options = options || {}

		if (!options.types) {
			options.types = NoteTypes
		}

		if (!options.modules) {
			options.modules = {
				copy,
				tLink: editor => tlinkModule(editor, {
					linkFollowRequirement: 'none'
				}),
				tangent: editor => editorModule(editor, {
					workspace: options.workspace,
					filepath: options.filepath
				})
			}
		}

		options.enabled = false

		super(options)
	}
}