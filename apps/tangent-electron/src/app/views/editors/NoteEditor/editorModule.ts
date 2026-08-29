import {
	Editor,
	EditorChangeEvent,
	type EditorRange,
	normalizeRange,
	Op,
	Line,
	Delta,
	AttributeMap,
	ShortcutEvent,
	isEqual,
	Source,
	TextChange,
	Decorator,
	DecorateEvent,
	TextDocument
} from 'typewriter-editor'

import { wait } from '@such-n-such/core'
import { parseMarkdown } from 'common/markdownModel'
import { getLineFormatData, getLineFormattingPrefix, type IndentDefinition, lineFormatEscapeMode } from 'common/markdownModel/line'
import { TangentLink } from './t-link'
import TangentCheckbox from './t-checkbox'
import TangentCodePreview from './t-code-preview' // No deletey
import TangentMath from './t-math' // No deletey
import { ListDefinition, listMatcher } from 'common/markdownModel/list'
import type { Workspace } from 'app/model'
import { deltaHasTextChanges, getEditInfo, getLineRangeWhile, getRangeWhile, lineToText } from 'common/typewriterUtils'
import { isLeftClick, startDrag } from 'app/utils'
import { subscribeUntil } from 'common/stores'
import { handleIsNode } from 'app/model/NodeHandle'
import { isLineCollapsed, lineCollapseDepth } from 'common/markdownModel/sections'
import { bustIntoSelection } from '../selectionBuster'
import type MarkdownEditor from './MarkdownEditor'
import { appendContextTemplate, type ContextMenuConstructorOptions } from 'app/model/menus'
import { eventHasSelectionRequest } from 'app/events'
import { createCommandHandler } from 'app/model/commands/Command'
import { verifyListContext } from './editorActions'

function clampRange(range: EditorRange, clampingRange: EditorRange): EditorRange {
	range = normalizeRange(range)
	clampingRange = normalizeRange(clampingRange)
	const first = Math.max(range[0], clampingRange[0])
	const second = Math.min(range[1], clampingRange[1])
	if (second < first) return null
	return [first, second]
}

interface VerificationInstruction<T> {
	func: (options: T, change: TextChange) => TextChange,
	options: T
}

// Force the inclusion of elements so it is included in the module
if (!TangentMath) {
	console.error('I don\'t have math!')
}
if (!TangentCodePreview) {
	console.error('I don\'t have code preview!')
}

export function revealContentAroundRange(doc: TextDocument, range: EditorRange, change: TextChange) {
	const selection = normalizeRange(range)
	const formats = doc.getTextFormat(selection)
	const lines = doc.getLinesAt(selection)

	if (lines.length === 0) return

	{
		// Expand line consideration to reveal collapsed sections
		let anchorCollapseDepth = lineCollapseDepth(lines[0])
		if (anchorCollapseDepth > 0) {
			const firstIndex = doc.lines.indexOf(lines[0])
			for (let i = firstIndex - 1; i >= 0; i--) {
				const line = doc.lines[i]
				const depth = lineCollapseDepth(line)
				if (depth === 0) break
				if (depth <= anchorCollapseDepth) {
					lines.unshift(doc.lines[i])
				}
				if (depth < anchorCollapseDepth) {
					anchorCollapseDepth = depth
				}
			}
		}
	}

	{
		let anchorCollapseDepth = lineCollapseDepth(lines.at(-1))
		if (anchorCollapseDepth > 0) {
			const lastIndex = doc.lines.indexOf(lines.at(-1))
			for (let i = lastIndex + 1; i < doc.lines.length; i++) {
				const line = doc.lines[i]
				const depth = lineCollapseDepth(line)
				if (depth === 0) break
				if (depth <= anchorCollapseDepth) {
					lines.push(doc.lines[i])
				}
				if (depth < anchorCollapseDepth) {
					anchorCollapseDepth = depth
				}
			}
		}
	}

	// Expand range to grab on either side
	selection[0] = selection[0] - 1
	selection[1] = selection[1] + 1
	
	for (const line of lines) {
		const lineRange = doc.getLineRange(line)
		const lineSelection = clampRange(selection, lineRange)
		if (lineSelection) {
			const relativeSelection = [lineSelection[0] - lineRange[0], lineSelection[1] - lineRange[0]]
			let earliestUnbrokenHidden = relativeSelection[0]
			let latestUnbrokenHidden = relativeSelection[1]

			const baseRevealLine = (line.attributes.hidden ?? false)
			
			let revealLine = baseRevealLine
			let hitRevealable = revealLine
			let foundLatest = false
			let textIndex = 0
			let opIndex = 0
			
			while (textIndex < line.length && opIndex < line.content.ops.length) {
				const op = line.content.ops[opIndex]
				const opLength = Op.length(op)
				const opEndIndex = textIndex + opLength
				if (textIndex <= relativeSelection[0]) {
					if (op.attributes?.hidden || op.attributes?.hiddenGroup) {
						hitRevealable = true
						if (op.attributes?.line_format) {
							revealLine = true
						}
						if (textIndex < earliestUnbrokenHidden) {
							earliestUnbrokenHidden = textIndex
						}
					}
					else {
						// Continuity broken, reset
						hitRevealable = false
						revealLine = baseRevealLine
						earliestUnbrokenHidden = relativeSelection[0]
					}
				}
				if (!foundLatest && opEndIndex >= relativeSelection[1]) {
					if (op.attributes?.hidden || op.attributes?.hiddenGroup) {
						hitRevealable = true
						if (op.attributes?.line_format) {
							revealLine = true
						}
						if (opEndIndex > latestUnbrokenHidden) {
							latestUnbrokenHidden = opEndIndex
						}
					}
					else {
						// Continuity broken, stop looking
						foundLatest = true
					}
				}
				
				opIndex++
				textIndex += opLength
				
				if (foundLatest && textIndex > relativeSelection[0]) {
					break
				}
			}
			
			if (hitRevealable || formats.hidden || formats.hiddenGroup) {
				const targetRange = [earliestUnbrokenHidden + lineRange[0], latestUnbrokenHidden + lineRange[0]] as EditorRange
				
				change.formatText(targetRange, { revealed: true })
			}
			if (revealLine) {
				change.formatLine(doc.getLineRange(line), { revealed: true}, true)
			}
		}
		
		if (isLineCollapsed(line)) {
			change.formatLine(doc.getLineRange(line), { collapsedReveal: true}, true)
		}
	}
}

export default function editorModule(editor: Editor, options: {
	workspace: Workspace
}) {
	// `editorModule` is allowed to do this as its the primary module and can know about
	// all default modules in MarkdownEditor
	const markdownEditor = editor as MarkdownEditor
	const { workspace } = options

	let allowVerification = true
	let verificationInstructions: (VerificationInstruction<unknown>)[] = []

	let updateSelectionReveal = true
	let smartParagraphBreaks = false

	let filepath = ''

	let fallback = false
	
	function pushVerification<T>(instruction: VerificationInstruction<T>) {
		if (verificationInstructions.length === 0) {
			setTimeout(() => {
				const instructions = verificationInstructions
				verificationInstructions = []

				allowVerification = false
				let change: TextChange = undefined
				for (const instruction of instructions) {
					change = instruction.func(instruction.options, change)
				}
				if (change) {
					change.apply()
				}
				allowVerification = true
			}, 0)
		}
		verificationInstructions.push(instruction)
	}

	/**
	 * Whether or not the delta could have been a keystroke that created
	 * a list glyph.
	 */
	function isListGlyphCreationChange(delta: Delta) {
		const changeInsert = getEditInfo(delta)
		if (changeInsert?.insert?.length === 1) {
			if (changeInsert.insert === '\n') return '\n'
			if (changeInsert.insert.match(/[\.\)\w\d\*\-\+ ]/) != null) {
				return true
			}
			return false
		}
		if (changeInsert?.shift < 0) {
			return false // Not a glyph creator, still a valid edit change
		}
		return null // Not a valid edit change
	}

	function scheduleLineVerification(delta: Delta, oldLine: Line, newLine?: Line) {
		const oldIndent = (oldLine.attributes.indent as IndentDefinition)?.indent ?? ''
		const newIndent = (newLine?.attributes.indent as IndentDefinition)?.indent ?? ''

		const oldList = oldLine.attributes.list as ListDefinition
		const newList = newLine?.attributes.list as ListDefinition

		const id = oldLine.id

		if (!isEqual(oldIndent, newIndent)) {
			const isGlyphCreator = isListGlyphCreationChange(delta)

			// The old indent level and the new indent level need to be verified
			pushVerification({
				func: verifyListContext,
				options: {
					id,
					editor: markdownEditor,
					targetIndent: newIndent,
					basis: (isGlyphCreator && newList) ? 'self' : 'rebasis',
					normalizeUnorderedGlyphs: true
				}
			})
			pushVerification({
				func: verifyListContext,
				options: {
					id,
					editor: markdownEditor,
					targetIndent: oldIndent,
					basis: 'rebasis',
					normalizeUnorderedGlyphs: true
				}
			})
		} 
		else if (oldList && newList) {
			if (!ListDefinition.areEqualExceptForActiveTodoState(oldList, newList)) {
				// Only do anything if there is a difference
				if (oldIndent === newIndent) {
					// Any change to form should propegate down
					pushVerification({
						func: verifyListContext,
						options: {
							id,
							editor: markdownEditor,
							targetIndent: oldIndent,
							basis: 'self',
							normalizeUnorderedGlyphs: true
						}
					})
				}
			}
		}
		else if (oldList) {
			// Was a list line, now it isn't
			pushVerification({
				func: verifyListContext,
				options: {
					id,
					editor: markdownEditor,
					targetIndent: oldIndent,
					basis: 'rebasis',
					normalizeUnorderedGlyphs: isListGlyphCreationChange(delta) !== '\n'
				}
			})
		}
		else if (newList) {
			// Was not a list line, now it is
			const isGlyphCreator = isListGlyphCreationChange(delta)
			// Ignore non-single-key edits (probably a paste)
			// Ignore new-line edits. Fixup will be handled by the other line
			if (isGlyphCreator != null && isGlyphCreator !== '\n') { 
				pushVerification({
					func: verifyListContext,
					options: {
						id,
						editor: markdownEditor,
						targetIndent: newIndent,
						basis: isGlyphCreator ? 'self' : 'rebasis',
						normalizeUnorderedGlyphs: true
					}
				})
			}
		}
	}

	function onChanging(event: EditorChangeEvent) {

		if (event.source === Source.api || event.source === Source.history || !editor.enabled || fallback) {
			// Only trigger reformatting when the user has changed the values
			return
		}

		if (event.change && event.changedLines && event.changedLines.length) {
			const changeEvent = event.change
			if (changeEvent.selectionChanged && changeEvent.selection === null && !deltaHasTextChanges(changeEvent.delta)) {
				// TODO: This is a patch around an issue fixed by https://github.com/typewriter-editor/typewriter-document/pull/5
				// Once this is fixed, remove this path.
				return
			}

			let doc = event.doc
			let change = doc.change

			let oldDoc = event.old
			let enforcedVerification: Map<string, Line> = null
			if (allowVerification) {
				if (doc.lines.length < oldDoc.lines.length) {
					// A line was deleted, and we should verify remaining lines
					let newLineIds = new Set(doc.lines.map(l => l.id))
					let verifyNextLine = false
					for (let i = 0; i < oldDoc.lines.length; i++) {
						const line = oldDoc.lines[i]
	
						if (!newLineIds.has(line.id)) {
							// We want to verify the next valid child
							verifyNextLine = true
						}
						else if (verifyNextLine) {
							verifyNextLine = false
							enforcedVerification = enforcedVerification || new Map()
							enforcedVerification.set(line.id, line)
						}
					}
				}
			}
			
			// Rebuild formatting for lines

			// Find the first & last line in the range, then re-parse everything in between
			let first = event.changedLines[0]
			let last = event.changedLines[event.changedLines.length - 1]

			let firstIndex = doc.lines.indexOf(first)
			let lastIndex = doc.lines.indexOf(last)

			let result = parseMarkdown(doc, {
				filepath,
				asFormatting: true, // This gives us a line that is just attributed retains
				autoEmbedRawLinks: workspace?.settings.rawLinksAutoEmbed.value,
				allowInterTextUnderscoreFormatting: workspace?.settings.allowInterTextUnderscoreFormatting.value,
				allowUnknownHTMLTags: workspace?.settings.allowUnknownHTMLTags.value,
				documentStartLine: firstIndex,
				documentEndLine: lastIndex
			})

			for (let newIndex = 0; newIndex < result.lines.length; newIndex++) {
				let newLine = result.lines[newIndex]
				let oldLine = doc.lines[result.startLineIndex + newIndex]

				// Check and schedule any automatic formatting updates
				if (allowVerification) {
					if (enforcedVerification) {
						enforcedVerification.delete(oldLine.id)
					}
					scheduleLineVerification(event.change.delta, oldLine, newLine)
				}

				// Apply the new line formatting
				const existingLineRange = doc.getLineRange(oldLine)
				const existingLineStart = existingLineRange[0]
				const existingLineFormat = doc.getLineFormat(existingLineRange)

				// Apply the new content formatting
				// Observe my absuse of typescript. `TextChange.compose()` is private.
				;(change as any).compose(existingLineStart, (delta: Delta) => {
					for (const op of newLine.content.ops) {
						delta.push(op)
					}

					// Apply the line attributes to the trailing newline
					const formatDiff = AttributeMap.diff(existingLineFormat, newLine.attributes)
					if (formatDiff) {
						// Collapsed state should be retained
						// TODO: The use of "diff" above may want to be reconsidered.
						// It might be better to use a "blank + new" approach similar to 
						// how inline elements are resolved.
						delete formatDiff.collapsed
					}
					delta.retain(1, formatDiff)
					return delta
				}, newLine.length)

				// This way is almost definitely faster, but it breaks decorations
				// let text = deltaToText(line.content)
				// let result = parseText(text)

				// // Ensure the line id remains the same
				// const lineId = line.attributes.id

				// line.attributes = result.lines[0].attributes
				// line.content = result.lines[0].content

				// // Restore line id
				// line.attributes.id = lineId
			}

			// Schedule any remaining forced verification
			if (enforcedVerification) {
				for (const line of enforcedVerification.values()) {
					scheduleLineVerification(event.change.delta, line)
				}
			}

			// Apply modifications
			event.modify(change.delta)
			doc = event.doc
			change = doc.change
		}
	}

	function onDecorate(event: DecorateEvent) {
		// Clear selection reveal
		if (updateSelectionReveal) {

			const revealDecorator = editor.modules.decorations.getDecorator('format-reveal') as Decorator
			revealDecorator.clear()
			
			const doc = event.doc
			// Use the change directly so that our effects aren't in the 'decorations' namespace.
			const change = revealDecorator.change
			
			// Apply selection reveal
			if (doc.selection) {
				revealContentAroundRange(doc, doc.selection.slice() as EditorRange, change)
			}
			
			revealDecorator.apply()
		}
	}

	function onMouseDown(event: MouseEvent) {
		if (isLeftClick(event)) {
			
			// Pause selection reveal until mouse up
			updateSelectionReveal = false

			// This needs to happen while selection reveal is paused or reveal can flicker.
			bustIntoSelection(editor, event)

			startDrag({
				end: () => {
					// Timeout delay is necessary to avoid a strange bug where
					// selection doesn't appear to update
					setTimeout(() => {
						// Resume selection reveal and force it to update
						updateSelectionReveal = true
						editor.modules.decorations.gatherDecorations()
						editor.render()
					}, 0);
				}
			})
		}
	}

	const commandHandler = workspace?.commands ? createCommandHandler([
		// Include native commands so that they can interrupt other actions
		workspace.commands.undo,
		workspace.commands.redo,
		workspace.commands.cut,
		workspace.commands.copy,
		workspace.commands.paste,
		workspace.commands.pasteAndMatchStyle,
		workspace.commands.selectAll,
		...Object.values(workspace.commands).filter(c => c.group === 'Notes')
	], {
		buildContext(context: any) {
			context.editor = markdownEditor
			context.selection = editor.doc.selection
		}
	}) : null

	function considerLineEmpty(newPrefix: string, line: Line) {
		if (!newPrefix) return false
		const lineText = lineToText(line)

		const listMatch = lineText.match(listMatcher)
		if (listMatch) {
			return listMatch[0].length === lineText.length
		}
		else {
			return line.length - 1 === newPrefix.length
				&& lineText.startsWith(newPrefix)
		}
	}

	function onEnter(event: ShortcutEvent) {
		const { doc } = editor
    	let { selection } = doc

		if (!selection) return
		selection = normalizeRange(selection)
		event.preventDefault()

		const [ at, to ] = selection

		const line = doc.getLineAt(selection[0])
		const [start, end] = doc.getLineRange(line)
		let newLinePrefix = getLineFormattingPrefix(line, true)

		// Check to see if this is blank line that should be breaking the prefix
		if (considerLineEmpty(newLinePrefix, line)) {
			const escapeMode = lineFormatEscapeMode(line)
			switch (escapeMode) {
				case 'single':
					editor.change
						.delete([start, end - 1])
						.insert(start, '\n')
						.apply()
					return
				case 'double':
					// Check for the ability to drop line formatting
					// on the current & previous lines
					const previousLine = doc.getLineAt(start - 1)
					const previousPrefix = getLineFormattingPrefix(previousLine)
					const thisData = getLineFormatData(line)
					const previousData = getLineFormatData(previousLine)
					if (previousPrefix.length === previousLine.length - 1 && isEqual(thisData, previousData)) {
						const [prevStart, prevEnd] = doc.getLineRange(previousLine)
						editor.change
							.delete([prevStart, prevEnd -1])
							.delete([start, end - 1])
							.select(prevStart + 1) // Dead reckoned this, it works :shrug:
							.apply()
						return
					}
					break;
			}
		}

		let lineAttributes: AttributeMap = {}
		if (line.attributes.code) {
			lineAttributes.code = line.attributes.code
		}
		else if (line.attributes.front_matter) {
			lineAttributes.front_matter = line.attributes.front_matter
		}

		let currentLinePrefix = getLineFormattingPrefix(line, false)
		// If the cursor is within the current line prefix
		if (at < start + currentLinePrefix.length) {
			// Drop non-whitespace (i.e. indent) characters from the prefix
			let whiteSpace = currentLinePrefix.match(/\s+/)
			if (whiteSpace) {
				newLinePrefix = whiteSpace[0].substring(0, at - start)
			}
			else {
				newLinePrefix = ''
			}
		}


		let newLines = '\n'

		if (smartParagraphBreaks) {
			// Insert an extra space for paragraphs
			const lineType = editor.typeset.lines.findByAttributes(line.attributes)
			if (lineType === undefined && line.length > 1 && at != start) {
				if (at === end - 1) {
					const nextLine = doc.getLineAt(end)
					if (!nextLine || nextLine.length === 1) {
						newLines += '\n'
					}
				}
				else {
					newLines += '\n'
				}
			}
		}
		
		editor.insert(newLines + newLinePrefix, lineAttributes)
	}

	function onBackspace(event: ShortcutEvent) {
		if (!smartParagraphBreaks) return

		// Delete a blank line in one stroke
		const doc = editor.doc
		const selection = doc.selection
		if (!selection || selection[0] !== selection[1]) {
			return
		}

		const [from, to] = selection
		const line = doc.getLineAt(from)
		const [start, end] = doc.getLineRange(line)

		if (start === 0 || from !== start) return
		const lineType = editor.typeset.lines.findByAttributes(line.attributes)
		if (lineType !== undefined) return

		const previousLine = doc.getLineAt(start - 1)
		if (previousLine.length > 1) return

		const previousPreviousLine = doc.getLineAt(start - 2)
		if (!previousPreviousLine || previousPreviousLine.length === 1) return
			
		const previousPreviousLineType = editor.typeset.lines.findByAttributes(previousPreviousLine.attributes)
		if (previousPreviousLineType !== undefined) return

		// This extends the selection backwards to delete the blank link
		editor.doc.selection = [from - 2, to]
	}

	function onEscape(event: ShortcutEvent) {
		const selection = editor.doc.selection
		if (selection && selection[0] !== selection[1]) {
			event.preventDefault()

			editor.select(selection[1])
		}
	}

	function toStartOfLine(event: ShortcutEvent, addToSelection=false) {
		const { doc } = editor
		if (!doc.selection) return
		
		// When multi selection has moved forwards, anchor < head
		// When multi selection has moved back, anchor > head
		const [anchor, head] = doc.selection

		const line = doc.getLineAt(head)
		const [start, end] = doc.getLineRange(line)

		const headBounds = editor.getBounds(head)
		const startBounds = editor.getBounds(start)

		if (headBounds.y > startBounds.y || anchor < start) return 

		event.preventDefault()
		
		const prefix = getLineFormattingPrefix(line)
		const trimmedStart = prefix.trimStart()

		let nextHead = start
		if (head > start + prefix.length) {
			nextHead = start + prefix.length
		}
		else if (head > start + (prefix.length - trimmedStart.length)) {
			nextHead = start + (prefix.length - trimmedStart.length)
		}
		
		if (addToSelection) {
			editor.select([anchor, nextHead])
		}
		else {
			editor.select(nextHead)
		}
	}

	function onKeyDown(event: ShortcutEvent) {
		if (event.defaultPrevented) return

		if (commandHandler && commandHandler(event)) return

		switch (event.modShortcut) {
			case 'Enter':
				return onEnter(event)
			case 'Backspace':
				return onBackspace(event)
			case 'Escape':
				return onEscape(event)
		}

		switch(event.shortcut) {
			case 'Home':
			case 'Cmd+ArrowLeft':
				return toStartOfLine(event)
			case 'Shift+Home':
			case 'Cmd+Shift+ArrowLeft':
				return toStartOfLine(event, true)
		}
	}

	function handleSelectionRequest(event: MouseEvent, mode: 'point' | 'all') {
		const selectionRequest = eventHasSelectionRequest(event)
		if (selectionRequest) {
			const index = editor.getIndexFromPoint(event.clientX, event.clientY)
			if (mode === 'point') {
				editor.select(index)
			}
			else if (mode === 'all') {
				let range: EditorRange = null

				if (selectionRequest.inline) {
					range = getRangeWhile(editor.doc, index - 1, selectionRequest.inline)
				}
				else if (selectionRequest.line) {
					range = getLineRangeWhile(editor.doc, index - 1, selectionRequest.line)
				}

				if (range) {
					if (selectionRequest.postProcessSelection) {
						range = selectionRequest.postProcessSelection(range)
					}
					editor.select(range)
				}
			}
		}
	}

	function onClick(event: MouseEvent) {
		handleSelectionRequest(event, 'point')
	}

	function onDoubleClick(event: MouseEvent) {
		handleSelectionRequest(event, 'all')
	}

	function onContextMenu(event: MouseEvent) {
		handleSelectionRequest(event, 'all')

		if (!workspace) return

		const menu: ContextMenuConstructorOptions[] = []

		const cmds = workspace.commands
		const commandContext = {
			initiatingEvent: event,
			editor: markdownEditor
		}

		menu.push({
			label: 'Formatting',
			submenu: [
				{ command: cmds.toggleBold, commandContext },
				{ command: cmds.toggleItalics, commandContext },
				{ command: cmds.toggleInlineCode, commandContext },
				{ type: 'separator' },
				{ command: cmds.setParagraph, commandContext },
				{ command: cmds.setHeader1, commandContext },
				{ command: cmds.setHeader2, commandContext },
				{ command: cmds.setHeader3, commandContext },
				{ command: cmds.setHeader4, commandContext },
				{ command: cmds.setHeader5, commandContext },
				{ command: cmds.setHeader6, commandContext },
				{ type: 'separator' },
				{ command: cmds.toggleCheckbox, commandContext }
			]
		})

		menu.push({
			label: 'Links',
			submenu: [
				{ command: cmds.toggleWikiLink, commandContext },
				{ command: cmds.toggleMDLink, commandContext }
			]
		})

		menu.push({
			label: 'Highlights',
			submenu: [
				{ command: cmds.toggleHighlight, commandContext },
				{ type: 'separator' },
				{ command: cmds.toggleCircleGrayHighlight, commandContext },
				{ command: cmds.toggleSquareGrayHighlight, commandContext },
				{ command: cmds.toggleCircleYellowHighlight, commandContext },
				{ command: cmds.toggleSquareYellowHighlight, commandContext },
				{ command: cmds.toggleCircleOrangeHighlight, commandContext },
				{ command: cmds.toggleSquareOrangeHighlight, commandContext },
				{ command: cmds.toggleCircleRedHighlight, commandContext },
				{ command: cmds.toggleSquareRedHighlight, commandContext },
				{ command: cmds.toggleCircleGreenHighlight, commandContext },
				{ command: cmds.toggleSquareGreenHighlight, commandContext },
				{ command: cmds.toggleCircleBlueHighlight, commandContext },
				{ command: cmds.toggleSquareBlueHighlight, commandContext },
				{ command: cmds.toggleCirclePurpleHighlight, commandContext },
				{ command: cmds.toggleSquarePurpleHighlight, commandContext },
			]
		}),

		menu.push({ type: 'separator' })

		menu.push({ command: cmds.collapseCurrentSection, commandContext })
		menu.push({ command: cmds.collapseAllSections, commandContext })
		menu.push({ command: cmds.expandAllSections, commandContext })

		appendContextTemplate(event, menu, 'middle')
	}

	function onPaste(event: ClipboardEvent) {

		const doc = editor.doc
		const selection = doc.selection
		if (!selection) return
		const [start, end] = normalizeRange(selection)

		const html = event.clipboardData.getData('text/html')
		if (html) {
			console.log(html)
		}
		
		const items = event.clipboardData.items
		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			if (item.type.startsWith('image')) {
				event.preventDefault()

				workspace.api.system.saveImageFromClipboard(filepath).then(path => {
					if (!path) return 

					subscribeUntil(workspace.getHandle(path), value => {
						if (handleIsNode(value)) {
							const workspacePath = workspace.directoryStore.getPathToItem(value, {
								length: 'short',
								includeExtension: true
							})

							const change = editor.change
							if (start !== end) {
								change.delete([start, end])
							}
							const insertion = `![[${workspacePath}]]`
							change.insert(start, insertion)
							change.select(start + insertion.length)
							change.apply()
							return true
						}
						return false
					}, 5000)
				})

				return
			}
		}
	}

	return {
		init() {
			editor.on('changing', onChanging)
			editor.on('decorate', onDecorate)
			
			editor.root.addEventListener('shortcut', onKeyDown)
			editor.root.addEventListener('mousedown', onMouseDown)
			editor.root.addEventListener('click', onClick)
			editor.root.addEventListener('dblclick', onDoubleClick)
			editor.root.addEventListener('contextmenu', onContextMenu)
			editor.root.addEventListener('paste', onPaste)
		},
		destroy() {
			editor.off('changing', onChanging)
			editor.off('decorate', onDecorate)
			
			editor.root.removeEventListener('shortcut', onKeyDown)
			editor.root.removeEventListener('mousedown', onMouseDown)
			editor.root.removeEventListener('click', onClick)
			editor.root.removeEventListener('dblclick', onDoubleClick)
			editor.root.removeEventListener('contextmenu', onContextMenu)
			editor.root.removeEventListener('paste', onPaste)
		},
		setNotePath(path) {
			filepath = path
		},
		setSmartParagraphBreaks(value) {
			smartParagraphBreaks = value
		},
		preventSelectionReveal(until?: Promise<unknown>) {
			updateSelectionReveal = false
			;(until ?? wait()).then(() => {
				updateSelectionReveal = true
			})
		},
		setFallbackMode(enabled=true) {
			fallback = enabled
		}
	}
}