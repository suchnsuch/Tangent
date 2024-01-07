import { Editor, EditorOptions } from 'typewriter-editor'
import { copy } from 'typewriter-editor/lib/modules/copy'

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
					linksNeedModClick: false
				}),
				tangent: editor => editorModule(editor, {
					workspace: null,
					linksNeedModClick: false
				})
			}
		}

		options.enabled = false

		super(options)
	}
}