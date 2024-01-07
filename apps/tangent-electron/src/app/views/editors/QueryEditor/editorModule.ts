import { firstOfType } from '@such-n-such/core'
import { QueryParseResult, KEYWORD } from '@such-n-such/tangent-query-parser'
import type { Workspace } from 'app/model'
import { getEditInfo } from 'common/typewriterUtils'
import { Decorator, Delta, Editor, EditorChangeEvent, Source } from 'typewriter-editor'
import type { IToken } from 'vscode-textmate'
import type { AutocompleteModule } from '../autocomplete/autocompleteModule'
import QueryAutocompleter from './QueryAutocompleter'

export default function editorModule(editor: Editor, workspace: Workspace) {

	let queryResult: QueryParseResult = null

	const autocomplete = editor.modules.autocomplete as AutocompleteModule
	const queryAutocomplete = firstOfType(autocomplete.handlers, QueryAutocompleter)

	const unsubs = [
		autocomplete.activeHandler.subscribe((handler, old) => {
			// We want to turn on & off error rendering when the query autocomplete
			// is enabled/disabled
			if (handler === queryAutocomplete || old === queryAutocomplete) {
				updateDecorations()
			}
		})
	]

	function updateQueryResult(result: QueryParseResult) {
		queryResult = result
		queryAutocomplete.updateQueryResult(result)
		updateDecorations()
	}

	function tokenText(source: string, token: IToken): string {
		return source.substring(token.startIndex, token.endIndex)
	}

	function updateDecorations() {
		const decorator = editor.modules.decorations.getDecorator('formatting') as Decorator

		const doc = editor.doc
		const change = decorator.change

		// Squash all existing token & error info
		change.setDelta(new Delta([{
			retain: doc.length,
			attributes: {
				token: null,
				error: null
			}
		}]))

		if (queryResult) {
			const text = doc.getText()
			for (let tokenIndex = 0; tokenIndex < queryResult.tokens.length; tokenIndex++) {
				const token = queryResult.tokens[tokenIndex]
				if (token.scopes.length === 1) continue

				let className = ''
				for (let i = 1; i < token.scopes.length; i++) {
					className += ' ' + token.scopes[i].replace(/\./g, ' ')
				}
				if (token.scopes.includes(KEYWORD.FORM)) {
					className += ' class-name' // For styling
				}

				change.formatText([token.startIndex, token.endIndex], {
					token: {
						className,
						index: tokenIndex,
						value: tokenText(text, token)
					}
				})
			}

			if (queryResult.errors && !queryAutocomplete.isActive) {
				for (let errorIndex = 0; errorIndex < queryResult.errors.length; errorIndex++) {
					const error = queryResult.errors[errorIndex]

					change.formatText([error.start, error.end], {
						error: error.message
					})
				}
			}
		}

		decorator.apply()
	}

	function getTokenIndex(textPosition: number) {
		for (let tokenIndex = 0; tokenIndex < queryResult.tokens.length; tokenIndex++) {
			const token = queryResult.tokens[tokenIndex]
			if (token.startIndex <= textPosition && token.endIndex > textPosition) {
				return tokenIndex
			}
		}
		return -1
	}

	function onChange(event: EditorChangeEvent) {
		if (event.source === Source.api || event.source === Source.history) return

		const changeDelta = event.change?.delta
		if (changeDelta) {
			const info = getEditInfo(changeDelta)
			if (info && queryResult.annotations) {
				for (let tokenIndex = 0; tokenIndex < queryResult.tokens.length; tokenIndex++) {
					const token = queryResult.tokens[tokenIndex]
					const annotation = queryResult.annotations[tokenIndex]

					if (token.startIndex < info.offset && token.endIndex > info.offset) {
						break
					}
				}
			}
		}
	}

	function autoInsertionPredicate(position: number, character: string) {
		const index = getTokenIndex(position)
		if (index < 0) return true
		const token = queryResult.tokens[index]

		switch (character) {
			case "'":
				return !token.scopes.includes(KEYWORD.VALUE.STRING_SINGLE)
			case '"':
				return !token.scopes.includes(KEYWORD.VALUE.STRING_DOUBLE)
		}

		return true
	}

	return {
		init() {
			editor.on('change', onChange)

			editor.modules.autoBraces.addInsertionPredicate(autoInsertionPredicate)
		},
		destroy() {
			editor.off('change', onChange)
			unsubs.forEach(u => u())
		},
		updateQueryResult
	}
}