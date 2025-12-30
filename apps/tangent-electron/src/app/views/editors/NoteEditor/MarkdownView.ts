import { Editor, type EditorOptions } from 'typewriter-editor'
import { copy } from 'typewriter-editor'

import NoteTypes from 'common/markdownModel/typewriterTypes'
import editorModule from "./editorModule";
import tlinkModule from '../t-linkModule';

/**
 * A typewriter-editor Editor intended to be a read-only view of markdown content
 */
export default class MarkdownView extends Editor {
	constructor(options?: EditorOptions) {
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
					workspace: null
				})
			}
		}

		options.enabled = false

		super(options)
	}
}