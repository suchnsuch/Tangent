import { Editor, EditorChangeEvent, Source, TextChange, TextDocument } from 'typewriter-editor'
import * as sections from 'common/markdownModel/sections'
import { lazyPush } from '@such-n-such/core'
import { WritableStore } from 'common/stores'
import { lineToText } from 'common/typewriterUtils'

export function collapsingSections(editor: Editor) {

	let collapsedState: WritableStore<number[]> = null

	let preventUncollapseOnEdit = 0
	
	function lineHasCollapsedChildren(lineIndex: number): boolean {
		const doc = editor.doc
		const line = doc.lines[lineIndex]
		return sections.lineHasCollapsedChildren(line)
	}

	function lineIsCollapsed(lineIndex: number): boolean {
		const doc = editor.doc
		const line = doc.lines[lineIndex]
		return line && sections.isLineCollapsed(line)
	}

	function toggleLineCollapsed(targets: number|number[]) {
		const doc = editor.doc
		const indexes = Array.isArray(targets) ? targets : [targets]

		if (indexes.length === 0) return
		
		let collapse: sections.CollapseChange = {}
		for (const index of indexes) {
			const line = doc.lines[index]
			if (sections.lineHasCollapsedChildren(line)) {
				collapse = sections.expandSection(doc, line, collapse)
			}
			else {
				collapse = sections.collapseSection(doc, line, collapse)
			}
		}
		
		preventUncollapseOnEdit++
		const change = editor.change
		sections.applyCollapseChange(collapse, change)
		change.apply()
		preventUncollapseOnEdit--
		
		applyCollapsedState()
	}

	function onChanging(event: EditorChangeEvent) {
		if (preventUncollapseOnEdit > 0 || event.source === Source.history) return
		if (event.change?.contentChanged && event.changedLines?.length) {

			const newDoc = event.doc
			const oldDoc = event.old
			let linesToTweak: string[] = null

			for (const changedLine of event.changedLines) {
				const oldLine = oldDoc.getLineBy(changedLine.id)
				const newLine = newDoc.getLineBy(changedLine.id)
				if (oldLine) {
					const oldState = oldLine.attributes.collapsed
					const newState = newLine.attributes.collapsed
					if (oldState !== newState || newState > 0 || newState < -1) {
						linesToTweak = lazyPush(linesToTweak, changedLine.id)
						continue
					}

					if (oldState < 0) { // IE collapsible & collapsed
						const index = newDoc.lines.indexOf(newLine)
						if (!sections.isLineCollapsible(newDoc.lines, index)) {
							linesToTweak = lazyPush(linesToTweak, changedLine.id)
						}
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

			const collapseTextChange = new TextChange(newDoc)
			sections.applyCollapseChange(collapseChange, collapseTextChange)
			event.modify(collapseTextChange.delta)
		}
	}

	function onChanged(event: EditorChangeEvent) {
		
		applyCollapsedState()
	}

	function applyCollapsedState() {
		if (collapsedState) {
			collapsedState.set(extractCollapsedState(editor.doc))
		}
	}

	function extractCollapsedState(doc: TextDocument): number[] | null {
		let result: number[] = null

		for (let i = 0; i < doc.lines.length; i++) {
			const line = doc.lines[i]
			if (sections.lineHasCollapsedChildren(line)) {
				result = lazyPush(result, i)
			}
		}

		return result
	}

	return {
		init() {
			editor.on('changing', onChanging)
			editor.on('changed', onChanged)
		},
		destroy() {
			editor.off('changing', onChanging)
			editor.off('changed', onChanged)
		},

		lineHasCollapsedChildren,
		lineIsCollapsed,
		toggleLineCollapsed,

		setCollapsedStateStore(store: WritableStore<number[]>) {
			collapsedState = store

			const doc = editor.doc
			const change = editor.change

			for (let i = 0; i < doc.lines.length; i++) {
				const range = doc.getLineRange(doc.lines[i])
				change.formatLine(range[0], {
					collapsed: null
				})
			}

			if (collapsedState.value) {
				let collapseChange: sections.CollapseChange = {}
				for (const index of collapsedState.value) {
					const line = doc.lines[index]
					if (!line) break
					if (!sections.isLineCollapsible(doc.lines, index)) break
					sections.collapseSection(doc, line, collapseChange)
				}
				sections.applyCollapseChange(collapseChange, change)
			}
			
			preventUncollapseOnEdit++
			change.apply()
			preventUncollapseOnEdit--
		},

		setUncollapseOnEdit(value: boolean) {
			preventUncollapseOnEdit += value ? -1 : 1
		}
	}
}

export type CollapsingSectionsModule = ReturnType<typeof collapsingSections>
