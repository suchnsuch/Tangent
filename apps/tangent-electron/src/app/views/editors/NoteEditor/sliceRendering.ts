import type { Line, TextDocument } from '@typewriter/document'
import { combineLines, getChangedRanges, patch, renderCombined, setLineNodesRanges, shouldExtendRanges, type Combined, type Editor, type EditorChangeEvent, type EditorRange, type RenderWhat } from "typewriter-editor"
import type { WritableStore } from "common/stores"
import { getDebugFlags, initDebugFlags } from 'app/utils/debug'

export type SliceRenderingInit = {
	sliceStore?: WritableStore<EditorRange>
}

type SliceDebugFlags = {
	logSliceRenderer: boolean
}
initDebugFlags<SliceDebugFlags>({
	logSliceRenderer: false
})

function logSlice() {
	return getDebugFlags<SliceDebugFlags>()?.logSliceRenderer
}

/**
 * Provides a replacement rendering module that supports only showing
 * a line-by-line slice of an entire document.
 * The presented slice automatically extends to include multi-line blocks.
 */
export function sliceRendering(editor: Editor, init?: SliceRenderingInit) {
	if (logSlice()) {
		console.log('Setting up sliced rendering!', init)
	}

	let rangeStore: WritableStore<EditorRange> = init?.sliceStore
	let cachedRange: EditorRange = null

	/** The first line of the slice */
	let lineStartId: string = null
	/** The line just after the slice. Null means to the end of the document. */
	let lineAfterId: string = null

	let unSubs: (() => void)[] = []

	editor.on('change', onChange)

	function pushSliceChanges() {
		if (!rangeStore || editor.doc.length <= 1) return
		const current = rangeStore.value

		if (logSlice()) {
			console.trace('updating slice from', {
				lineStartId, lineAfterId
			})
		}

		if (!lineStartId && !lineAfterId) {
			if (current) {
				cachedRange = null
				rangeStore.set(null)
			}
			else return
		}

		let from = editor.doc.getLineRange(lineStartId)?.[0]
		let to = (lineAfterId
			? editor.doc.getLineRange(lineAfterId)?.[0]
			: editor.doc.length) - 1

		if (!current || current[0] != from || current[1] != to) {
			const range: EditorRange = [from, to]
			cachedRange = range
			if (logSlice()) {
				console.log('updating slice', current, range)
			}
			rangeStore.set(range)
		}
	}

	function updateRangeLines(range: EditorRange) {
		// Do our own caching so that our updates don't trigger issues
		if (range === cachedRange) return false
		const { doc } = editor
		if (doc.length <= 1) return false

		const shouldLog = logSlice()
		
		cachedRange = range

		let startIndex = -1
		let endIndex = -1

		let index = 0

		// Find initial start
		for (; index < doc.lines.length; index++) {
			const [start, end] = doc.getLineRange(doc.lines[index])
			if (start <= range[0] && end > range[0]) {
				startIndex = index
				break
			}
		}

		if (shouldLog) {
			console.log('Found line', startIndex, 'for', range[0])
		}

		const isMultiLine = (index: number, next: number) => {
			// TODO: List lines?
			const line = doc.lines[index]
			if (!line) return false

			const type = editor.typeset.lines.findByAttributes(line.attributes, true)
			if (!type.shouldCombine) return false

			const nextLine = doc.lines[next]
			if (!nextLine) return false

			return type.shouldCombine(line.attributes, nextLine.attributes)
		}

		while (isMultiLine(startIndex - 1, startIndex)) {
			startIndex--
		}

		// Find initial end
		for (; index < doc.lines.length; index++) {
			const [start, end] = doc.getLineRange(doc.lines[index])
			if (start <= range[1] && end > range[1]) {
				endIndex = index
				break
			}
		}

		if (shouldLog) {
			console.log('Found line', endIndex, 'for', range[1])
		}

		while (isMultiLine(endIndex, endIndex + 1)) {
			endIndex++
		}

		const nextStartId = doc.lines[startIndex]?.id ?? null
		const nextAfterId = doc.lines[endIndex + 1]?.id ?? null

		if (shouldLog) {
			console.log('line ids', {
				nextStartId, nextAfterId
			})
		}

		if (nextStartId !== lineStartId || nextAfterId !== lineAfterId) {
			lineStartId = nextStartId
			lineAfterId = nextAfterId
		}

		return true
	}

	if (rangeStore) {
		unSubs.push(rangeStore.subscribe(range => {
			if (updateRangeLines(range)) {
				pushSliceChanges()
			}
		}))
	}

	function getSlicedCombinedLines(lines: Line[]): Combined {
		const data = combineLines(editor, lines)

		const startIndex = lineStartId ? data.combined.indexOf(data.byKey[lineStartId]) : 0
		const endIndex = lineAfterId ? data.combined.indexOf(data.byKey[lineAfterId]) : undefined
		
		if (logSlice()) {
			console.log('combined indices', {
				lineStartId, lineAfterId,
				startIndex, endIndex
			})
		}

		if (startIndex == null && endIndex == null) return data.combined
		if (startIndex == -1 && endIndex == -1) return null

		return data.combined.slice(startIndex, endIndex)
	}

	// A near-copy of `render()` in typewriters rendering/rendering.ts module
	function renderWhole(doc: TextDocument, combined?: Combined) {
		const { root } = editor
		editor.dispatchEvent(new Event('rendering'))
		combined = combined ?? getSlicedCombinedLines(doc.lines)
		patch(root, renderCombined(editor, combined)) as HTMLElement
		setLineNodesRanges(editor)
		editor.dispatchEvent(new Event('render'))
		editor.dispatchEvent(new Event('rendered'))
	}

	// A near-copy of `renderChanges()` in typewriters rendering/rendering.ts module
	function renderChanges(oldDoc: TextDocument, newDoc: TextDocument) {
		const { root } = editor
		// Ranges of line indexes, not document indexes
		const oldCombined = getSlicedCombinedLines(oldDoc.lines)
		const newCombined = getSlicedCombinedLines(newDoc.lines)
		if (!oldCombined) {
			return renderWhole(newDoc, newCombined)
		}
		const [oldRange, newRange] = getChangedRanges(oldCombined, newCombined)

		if (logSlice()) {
			console.log('changed ranges', { oldRange, newRange })
		}
		
		// If necessary, expand ranges by 1 on each side to ensure the vdom can rerender
		// The vdom needs solid line anchors, so this will also extend when leading or trailing line ids differ
		if (shouldExtendRanges(oldRange, newRange, oldCombined, newCombined)) {
			oldRange[0] = Math.max(0, oldRange[0] - 1)
			newRange[0] = Math.max(0, newRange[0] - 1)
			oldRange[1] = Math.min(oldCombined.length, oldRange[1] + 1)
			newRange[1] = Math.min(newCombined.length, newRange[1] + 1)
			if (root.childNodes.length !== oldCombined.length) {
				// The DOM has changed since we last rendered, adjust the oldRange accordingly to get the correct slice
				oldRange[1] += root.childNodes.length - oldCombined.length
			}
		}

		const oldSlice = Array.from(root.childNodes).slice(oldRange[0], oldRange[1])
		const newSlice = newCombined.slice(newRange[0], newRange[1])
		if (!oldSlice.length && !newSlice.length) return renderWhole(newDoc)
		editor.dispatchEvent(new Event('rendering'))
		patch(root, renderCombined(editor, newSlice), oldSlice) as HTMLElement
		setLineNodesRanges(editor)
		editor.dispatchEvent(new Event('render'))
		editor.dispatchEvent(new Event('rendered'))
	}

	function render(what?: RenderWhat) {
		if (!what) {
			const { doc } = (editor.modules.decorations as { doc: TextDocument }) || editor
			renderWhole(doc)
		}
		else {
			const { doc, old } = what
			if (old && doc) {
				renderChanges(old, doc)
			}
			else if (doc) {
				renderWhole(doc)
			}
		}
	}

	function onChange(event: EditorChangeEvent) {
		const { doc, old } = (editor.modules.decorations as { old: TextDocument; doc: TextDocument }) || event
		if (old.lines !== doc.lines) {
			updateRangeLines(rangeStore?.value)
			renderChanges(old, doc)
			if (doc.length > 1) {
				pushSliceChanges()
			}
		}
	}

	return {
		render,
		destroy() {
			editor.off('change', onChange)
			for (const unSub of unSubs) {
				unSub()
			}
		}
	}
}
