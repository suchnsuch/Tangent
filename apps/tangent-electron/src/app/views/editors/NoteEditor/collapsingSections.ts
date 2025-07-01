import { DecorationsModule, Editor, EditorChangeEvent, TextDocument } from 'typewriter-editor'
import * as sections from 'common/markdownModel/sections'
import { lineToText } from 'common/typewriterUtils'
import { lazyPush } from '@such-n-such/core'

export function collapsingSections(editor: Editor) {

	let oldDoc: TextDocument = null
	
	function decorations() {
		return editor.modules.decorations as DecorationsModule
	}

	function getDecorator() {
		return decorations().getDecorator('collapsedSections')
	}

	function lineHasCollapsedChildren(lineIndex: number): boolean {
		const doc = decorations().doc
		const line = doc.lines[lineIndex]
		return sections.lineHasCollapsedChildren(line)
	}

	function lineIsCollapsed(lineIndex: number): boolean {
		const doc = decorations().doc
		const line = doc.lines[lineIndex]
		return line && sections.isLineCollapsed(line)
	}

	function toggleLineCollapsed(lineIndex: number) {
		const doc = decorations().doc
		const line = doc.lines[lineIndex]

		let collapse: sections.CollapseChange
		
		if (sections.lineHasCollapsedChildren(line)) {
			collapse = sections.expandSection(doc, line)
		}
		else {
			collapse = sections.collapseSection(doc, line)
		}

		const decorator = getDecorator()
		sections.applyCollapseChange(collapse, decorator.change)
		decorator.apply()
	}

	function onChanging(event: EditorChangeEvent) {
		// Cache the old decorations doc so that we can compare against it
		oldDoc = decorations().doc
	}

	function onChanged(event: EditorChangeEvent) {
		if (event.change?.contentChanged && event.changedLines?.length) {

			const newDoc = decorations().doc
			let linesToTweak: string[] = null

			for (const changedLine of event.changedLines) {
				const oldLine = oldDoc.getLineBy(changedLine.id)
				const newLine = newDoc.getLineBy(changedLine.id)
				if (oldLine) {
					const oldState = oldLine.attributes.collapsed
					const newState = newLine.attributes.collapsed
					if (oldState !== newState) {
						linesToTweak = lazyPush(linesToTweak, changedLine.id)
					}
				}
				else {
					linesToTweak = lazyPush(linesToTweak, changedLine.id)
				}
			}

			if (!linesToTweak) return

			// Find adjacent collapsed sections and expand them
			const collapseChange: sections.CollapseChange = {}
			for (const id of linesToTweak) {
				collapseChange[id] = 0
				const index = newDoc.lines.findIndex(l => l.id === id)
				for (let i = index - 1; i >= 0; i--) {
					const line = newDoc.lines[i]
					const collapsed = line.attributes.collapsed
					if ((typeof collapsed === 'number' && collapsed !== 0) ||
						linesToTweak.includes(line.id)
					) {
						collapseChange[line.id] = 0
					}
					else break
				}
				for (let i = index + 1; i < newDoc.lines.length; i++) {
					const line = newDoc.lines[i]
					const collapsed = line.attributes.collapsed
					if ((typeof collapsed === 'number' && collapsed !== 0) ||
						linesToTweak.includes(line.id)
					) {
						collapseChange[line.id] = 0
					}
					else break
				}
			}

			const decorator = getDecorator()
			sections.applyCollapseChange(collapseChange, decorator.change)
			decorator.apply()
		}
	}

	return {
		init() {
			editor.on('changing', onChanging)
			editor.on('changed', onChanged)
		},
		destroy() {
			editor.off('changing', onChanging)
			editor.off('changed', onChanged)
			oldDoc = null
		},

		lineHasCollapsedChildren,
		lineIsCollapsed,
		toggleLineCollapsed,
	}
}

export type CollapsingSectionsModule = ReturnType<typeof collapsingSections>
