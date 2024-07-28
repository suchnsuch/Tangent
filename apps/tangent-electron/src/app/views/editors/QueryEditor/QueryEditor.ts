import type { Workspace } from 'app/model';
import { defaultModules, Editor, EditorOptions } from 'typewriter-editor';
import WikiLinkAutocompleter from '../autocomplete/WikiLinkAutocompleter'
import autocompleteBuilder from '../autocomplete/autocompleteModule'
import autoBraces from '../autobraces/autoBracesModule'
import editorModule from './editorModule';
import { queryTypeset } from 'common/queryModel/typewriterTypes'
import { MATCHING_BRACES } from '@such-n-such/tangent-query-parser';
import QueryAutocompleter from './QueryAutocompleter';
import { selectionModule } from '../selectionEvents';
import TagAutocompleter from '../autocomplete/TagAutocompleter';
import autoWrapping from '../autobraces/autoWrappingModule';

export default class QueryEditor extends Editor {
	constructor(workspace: Workspace, options?: EditorOptions) {
		options = options ?? {}

		if (!options.types) {
			options.types = queryTypeset
		}

		if (!options.modules) {
			const {
				copy,
				paste,
				... trimmedDefaultModules
			} = defaultModules

			options.modules = {
				autocomplete: workspace ? autocompleteBuilder([
					new WikiLinkAutocompleter(workspace, {
						enableContent: false,
						enableText: false,
						enableEmbedding: false
					}),
					new TagAutocompleter(workspace, {
						includeTrailingSpace: false
					}),
					new QueryAutocompleter()
				]) : null,

				...trimmedDefaultModules,

				autoWrapping,
				autoBraces: editor => autoBraces(editor, { values: MATCHING_BRACES }),
				selectionEvents: selectionModule,

				// This goes before copy/paste to get priority over those events
				query: editor => editorModule(editor, workspace),
				
				copy: editor => copy(editor, { copyPlainText: true }),
				paste: editor => paste(editor)
			}

			// Prevent key ordering destruction
			options.includeDefaultModules = false
		}

		super(options)
	}
}
