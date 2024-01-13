import type { EditorRange } from "@typewriter/document"
import type NodeViewState from "./NodeViewState"
import type NoteFile from "../NoteFile"
import { PartialLink, StructureType } from "common/indexing/indexTypes"
import { ReadableStore, WritableStore } from 'common/stores'
import type { StructureDelta } from 'common/indexing/structureUtils'
import type LensViewState from './LensViewState'

import NoteEditor from 'app/views/editors/NoteEditor/NoteEditor.svelte'
import type ViewStateContext from './ViewStateContext'
import { MapStrength } from 'common/tangentMap/MapNode'
import type { Annotation } from 'common/nodeReferences'
import { safeHeaderLine } from 'common/markdownModel/header'
import { lineToText } from 'common/typewriterUtils'

export enum NoteDetailMode {
	None = 0,
	Words = 1 << 0,
	Characters = 1 << 1,
	LinkSummary = 1 << 2,
	Details = 1 << 3,

	All = Words | Characters | LinkSummary | Details,
	WordsAndChars = Words | Characters
}

export default class NoteViewState implements NodeViewState, LensViewState {
	readonly context: ViewStateContext
	readonly note: NoteFile
	selection: EditorRange
	detailMode: NoteDetailMode

	readonly linkHighlight: WritableStore<PartialLink> = new WritableStore(null)
	readonly annotations: WritableStore<Annotation[]> = new WritableStore([])
	readonly scrollY: WritableStore<number> = new WritableStore(0)

	private structureUnobserver?: () => void

	readonly currentLens: ReadableStore<LensViewState>

	constructor(context: ViewStateContext, file: NoteFile, showDetails=NoteDetailMode.None) {
		this.context = context
		this.note = file
		this.detailMode = showDetails

		this.note.loadFile()
		this.structureUnobserver = this.note.observeStructureChanges(delta => {
			this.onStructureChange(delta)
		})

		this.currentLens = new ReadableStore(this)
	}

	get node() { return this.note }

	// Lens interface
	get parent() { return this }
	get viewComponent() { return NoteEditor }

	onStructureChange(delta: StructureDelta) {
		const session = this.context.tangent.activeSession.value
		if (!session) {
			console.error('No session found for view state!', this)
		}

		const map = session.map
		const node = this.node

		session.undoStack.withUndoGroup(() => {
			// Ensure this node is on the map
			const mapNode = map.getOrCreate(node, MapStrength.Navigated)

			for (const removed of delta.removed) {
				if (removed.type === StructureType.Link || removed.type === StructureType.Embed) {
					const connection = map.findConnection(mapNode, removed.to)
					if (connection && connection.strength.value === MapStrength.Connected) {
						const to = connection.to.value
						// Only remove automatic connections
						map.disconnect(connection)
						// Clear out nodes that no longer need to be here
						if (to.strength.value === MapStrength.Connected
							&& to.incoming.length === 0
							&& to.outgoing.length === 0) {
							map.delete(to)
						}
					}
				}
			}

			for (const added of delta.added) {
				if (added.type === StructureType.Link || added.type === StructureType.Embed) {
					if (added.to) {
						map.connect({
							from: mapNode,
							to: added.to,
							strength: MapStrength.Connected,
							preventRecursiveLinks: true
						})
					}
				}
			}
		})
	}

	dispose() {
		this.note.dropFile()
		this.structureUnobserver()
	}

	focus(element: HTMLElement) {
		const list = element?.querySelectorAll('.noteEditor')
		if (list) {
			let targetEditorElement: HTMLElement = null
			let wasAnyActive = false

			list.forEach(noteEditor => {
				const editorElement = noteEditor.querySelector('article')
				const headerElement = noteEditor.querySelector('header > .title')
				if (!targetEditorElement) {
					targetEditorElement = editorElement
				}
				if (document.activeElement === editorElement || document.activeElement === headerElement) {
					wasAnyActive = true
				}
			})

			if (!wasAnyActive && targetEditorElement) {
				targetEditorElement.dispatchEvent(new Event('resumeFocus'))
				return true
			}
		}
	}

	highlightLink(link: PartialLink) {
		if (this.note.isReady) {
			this.highlightLinkInternal(link)
		}
		else {
			let reset: () => void = null
			const wait = note => {
				if (note.isReady) {
					reset()
					this.highlightLinkInternal(link)
				}
			}
			reset = this.note.subscribe(wait)
		}
	}

	private highlightLinkInternal(link: PartialLink) {
		let annotation: Annotation = { start: -1, end: -1, data: link }
		if (link.start != null && link.end != null) {
			annotation.start = link.start
			annotation.end = link.end
		}
		else if (link.content_id) {
			const id = link.content_id
			// Look for headers
			let start = 0
			for (const line of this.note.lines) {
				if (line.attributes.header && safeHeaderLine(lineToText(line)) === id) {
					annotation.start = start
					annotation.end = start + line.length
					break
				}
				start += line.length
			}
		}

		if (annotation.start >= 0 || annotation.end >= 0) {
			this.annotations.update(a => [...a, annotation])
		}
	}
}
