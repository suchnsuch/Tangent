import {
	Editor,
	EditorChangeEvent,
	EditorRange,
	normalizeRange,
	deltaToText, 
	Op,
	Line,
	Delta,
	AttributeMap,
	ShortcutEvent,
	isEqual,
	Source,
	TextChange,
	Decorator,
	DecorateEvent
} from 'typewriter-editor'

import { requestCallbackOnIdle, wait } from '@such-n-such/core'
import { parseMarkdown } from 'common/markdownModel'
import { getLineFormatData, getLineFormattingPrefix, IndentDefinition, lineFormatEscapeMode } from 'common/markdownModel/line'
import TangentLink from './t-link'
import TangentCheckbox from './t-checkbox'
import TangentMath from './t-math' // No deletey
import { indentMatcher } from 'common/markdownModel/matches'
import { getGlyphForNumber, ListDefinition, ListForm, listMatcher } from 'common/markdownModel/list'
import type { HrefFormedLink } from 'common/indexing/indexTypes'
import type { Workspace } from 'app/model'
import type { AutocompleteModule } from '../autocomplete/autocompleteModule'
import { findLinkAround, matchMarkdownLink, matchWikiLink, resolveLink } from 'common/markdownModel/links'
import { AttributePredicate, findWordAroundPositionInDocument, getEditInfo, getRangeWhile, getRangesIntersecting, intersectRanges, rangeIsCollapsed } from 'common/typewriterUtils'
import { isLeftClick, startDrag } from 'app/utils'
import { repeatString } from '@such-n-such/core'
import { subscribeUntil } from 'common/stores'

function clampRange(range: EditorRange, clampingRange: EditorRange): EditorRange {
	range = normalizeRange(range)
	clampingRange = normalizeRange(clampingRange)
	return [Math.max(range[0], clampingRange[0]), Math.min(range[1], clampingRange[1])]
}

function onError(error) {
	console.error(error)
	console.error(error.error)
}

interface VerificationInstruction<T> {
	func: (options: T, change: TextChange) => TextChange,
	options: T
}

interface VerifyListOptions {
	id: string,
	targetIndent: string,
	// Whether to apply the line's list format or incorporate into siblings'
	basis: 'self' | 'rebasis'
}

// Force the inclusion of the variable so it is included in the variable
if (!TangentMath) {
	console.error('I don\'t have math!')
}

export default function editorModule(editor: Editor, options: {
	workspace: Workspace
	linksNeedModClick?: boolean
}) {
	const { workspace } = options

	let linksNeedModClick = options.linksNeedModClick ?? true

	let allowVerification = true
	let verificationInstructions: (VerificationInstruction<unknown>)[] = []

	let updateSelectionReveal = true
	let smartParagraphBreaks = false

	let filepath = ''
	
	function pushVerification<T>(instruction: VerificationInstruction<T>) {
		if (verificationInstructions.length === 0) {
			requestCallbackOnIdle(() => {
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
			})
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
			return changeInsert.insert.match(/[\.\w\d\*\-\+]/) != null
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
					targetIndent: oldIndent,
					basis: 'rebasis'
				}
			})
			pushVerification({
				func: verifyListContext,
				options: {
					id,
					targetIndent: newIndent,
					basis: (isGlyphCreator && newList) ? 'self' : 'rebasis'
				}
			})
		} 
		else if (oldList && newList) {
			if (!isEqual(oldList, newList)) {
				// Only do anything if there is a difference
				if (oldList.indent === newList.indent) {
					// Any change to form should propegate down
					pushVerification({
						func: verifyListContext,
						options: {
							id,
							targetIndent: oldIndent,
							basis: 'self'
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
					targetIndent: oldIndent,
					basis: 'rebasis'
				}
			})
		}
		else if (newList) {
			// Was not a list line, now it is
			const isGlyphCreator = isListGlyphCreationChange(delta)
			if (isGlyphCreator != null) { // Ignore non-single-key edits (probably a paste)
				pushVerification({
					func: verifyListContext,
					options: {
						id,
						targetIndent: newIndent,
						basis: isGlyphCreator ? 'self' : 'rebasis'
					}
				})
			}
		}
	}

	function verifyListContext(
		options: VerifyListOptions,
		change?: TextChange // An existing change to work with 
	): TextChange {
		const { doc } = editor
		let selection = doc.selection?.slice()
		let targetLine = doc.getLineBy(options.id)

		if (!targetLine) return change

		let lineText = deltaToText(targetLine.content)
		let intendedIndent = options.targetIndent

		let targetRange = doc.getLineRange(targetLine)
		let targetLineIndex = doc.lines.indexOf(targetLine)

		let targetListData = targetLine.attributes.list as ListDefinition
		let targetIndent = targetLine.attributes.indent?.indent || ''

		let targetForm: ListForm = undefined
		let targetGlyph: string = undefined
		let basisNumber: number = undefined
		
		if (options.basis === 'self') {
			if (!targetListData) {
				console.error('Was told to verify a basis of "self", but the target line had no list data')
				return change
			}

			targetForm = targetListData.form
			targetGlyph = targetListData.glyph
			basisNumber = targetListData.index
		}
		else if (!targetListData || targetIndent === intendedIndent || targetIndent.length > intendedIndent.length) {
			// Find the basis for this indent level
			for (let lineIndex = targetLineIndex - 1; lineIndex > 0; lineIndex--) {
				let prevLine = doc.lines[lineIndex]
				let prevText = deltaToText(prevLine.content)
				let indent = prevText.match(indentMatcher)[0]

				if (indent === intendedIndent) {
					// This is what we're looking for
					const listData = prevLine.attributes.list as ListDefinition
					if (listData) {
						targetForm = listData.form
						targetGlyph = listData.glyph
						basisNumber = listData.index

						if (basisNumber) basisNumber++
					}
					break
				}
				else if (indent.length < intendedIndent.length) {
					break
				}
			}
		}

		if (targetForm === undefined || targetIndent.length < intendedIndent.length || (targetIndent === intendedIndent && !targetListData)) {
			// Still don't have a target form. Look forward to find one
			for (let lineIndex = targetLineIndex + 1; lineIndex < doc.lines.length; lineIndex++) {
				let nextLine = doc.lines[lineIndex]
				let nextText = deltaToText(nextLine.content)
				let indent = nextText.match(indentMatcher)[0]
	
				if (indent === intendedIndent) {
					const listData = nextLine.attributes.list as ListDefinition
					if (!listData) break // End of the road
	
					// We might have removed the top out
					targetForm = listData.form
					targetGlyph = listData.glyph
					basisNumber = listData.index

					if (basisNumber) {
						// Reset the basis number
						basisNumber = 1
					}
					break
				}
				else if (indent.length < intendedIndent.length) {
					break
				}
			}
		}

		if (targetForm === undefined && targetListData) {
			// Still no target form. Take the list's current form
			targetForm = targetListData.form
			targetGlyph = targetListData.glyph
		}

		let offset = 0
		function addToOffset(position: number, addition: number) {
			if (selection) {
				if (selection[0] + offset > position) {
					selection[0] += addition
				}
				if (selection[1] + offset > position) {
					selection[1] += addition
				}
			}

			offset += addition
		}

		let didSomething = false

		// Propegate the target form & basis to the indicated line
		if (targetListData && targetIndent === intendedIndent) {
			if (targetListData.form !== targetForm || targetListData.index !== basisNumber) {

				change = change || editor.change

				const listMatch = lineText.match(listMatcher)
				let newGlyph = getGlyphForNumber(targetForm, basisNumber)
				if (!newGlyph) {
					newGlyph = targetGlyph
				}

				const lineStart = targetRange[0]
				const insertedText = listMatch[1] + newGlyph + ' '
				const sizeDiff = insertedText.length - listMatch[0].length
				const deleteEnd = lineStart + listMatch[0].length
				change
					.delete([lineStart, deleteEnd])
					.insert(deleteEnd, insertedText)
				didSomething = true

				addToOffset(lineStart, sizeDiff)
			}
			if (basisNumber) basisNumber++
		}
		
		// Propegate the target form & basis all following list lines on the indent level
		for (let lineIndex = targetLineIndex + 1; lineIndex < doc.lines.length; lineIndex++) {
			let nextLine = doc.lines[lineIndex]
			let nextText = deltaToText(nextLine.content)
			let indent = nextText.match(indentMatcher)[0]

			if (indent === intendedIndent) {
				const listData = nextLine.attributes.list as ListDefinition
				if (!listData) break // End of the road

				if (listData.form !== targetForm || listData.index !== basisNumber) {
					change = change || editor.change

					const listMatch = nextText.match(listMatcher)
					let newGlyph = getGlyphForNumber(targetForm, basisNumber)
					if (!newGlyph) {
						newGlyph = targetGlyph
					}

					let lineRange = doc.getLineRange(nextLine)
					const lineStart = lineRange[0]
					const insertedText = listMatch[1] + newGlyph + ' '
					const sizeDiff = insertedText.length - listMatch[0].length
					const deleteEnd = lineStart + listMatch[0].length
					change
						.delete([lineStart, deleteEnd])
						.insert(deleteEnd, insertedText)

					didSomething = true
					
					addToOffset(lineStart, sizeDiff)
				}

				if (basisNumber) basisNumber++
			}
			else if (indent.length < intendedIndent.length) {
				// We've reached the end of the current indentation.
				break
			}
		}

		if (didSomething && selection && change) {
			change.select(selection as EditorRange)
		}

		return change
	}

	function onChanging(event: EditorChangeEvent) {

		if (event.source === Source.api || event.source === Source.history || !editor.enabled) {
			// Only trigger reformatting when the user has changed the values
			return
		}

		let doc = event.doc
		let change = doc.change

		if (event.change && event.changedLines && event.changedLines.length) {

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
				const formatDiff = AttributeMap.diff(existingLineFormat, newLine.attributes)
				if (formatDiff) {
					change.formatLine(existingLineStart, formatDiff, true)
				}

				// Apply the new content formatting
				// Observe my absuse of typescript. `TextChange.compose()` is private.
				;(change as any).compose(existingLineStart, (delta: Delta) => {
					for (const op of newLine.content.ops) {
						delta.push(op)
					}
					// Retain the new line character as well
					delta.retain(1)
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
				const selection = normalizeRange(doc.selection.slice() as EditorRange)
				const formats = doc.getTextFormat(selection)
				const lines = doc.getLinesAt(selection)
				
				for (let line of lines) {
					// Expand range to grab on either side
					selection[0] = selection[0] - 1
					selection[1] = selection[1] + 1
	
					const lineRange = doc.getLineRange(line)
					const lineSelection = clampRange(selection, lineRange)
					const relativeSelection = [lineSelection[0] - lineRange[0], lineSelection[1] - lineRange[0]]
					
					let earliestUnbrokenHidden = relativeSelection[0]
					let latestUnbrokenHidden = relativeSelection[1]
					const isHiddenLine = line.attributes.hidden ?? false 
					let hitLineFormat = isHiddenLine
					let hitRevealable = hitLineFormat
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
									hitLineFormat = true
								}
								if (textIndex < earliestUnbrokenHidden) {
									earliestUnbrokenHidden = textIndex
								}
							}
							else {
								// Continuity broken, reset
								hitRevealable = false
								hitLineFormat = isHiddenLine
								earliestUnbrokenHidden = relativeSelection[0]
							}
						}
						if (!foundLatest && opEndIndex >= relativeSelection[1]) {
							if (op.attributes?.hidden || op.attributes?.hiddenGroup) {
								hitRevealable = true
								if (op.attributes?.line_format) {
									hitLineFormat = true
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
					if (hitLineFormat) {
						change.formatLine(doc.getLineRange(line), { revealed: true}, true)
					}
				}
			}
			
			revealDecorator.apply()
		}
	}

	function onMouseDown(event: MouseEvent) {
		if ((!linksNeedModClick || event.metaKey || event.ctrlKey) && TangentLink.isTangentLinkEvent(event)) {
			event.preventDefault()
			return
		}

		if (isLeftClick(event)) {
			
			// Pause selection reveal until mouse up
			updateSelectionReveal = false

			// Force a selection reset.
			// This allows you to click inside an existing selection.
			// This needs to happen while selection reveal is paused or reveal can flicker.
			if (!rangeIsCollapsed(editor.doc.selection)) {
				editor.select(null)
			}
			
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
		if (newLinePrefix && line.length - 1 === newLinePrefix.length) {
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

	async function toggleLink(event: ShortcutEvent) {
		const { doc } = editor
		const selection = normalizeRange(doc.selection)
		if (!selection) return
		const [at, to] = selection
		
		const activeFormats = doc.getFormats(selection)
		
		const link = activeFormats.t_link as HrefFormedLink
		// No stomping!
		if (link?.form === 'wiki') return

		event.preventDefault()
		
		if (link) {
			if (link.form === 'raw') {
				// Convert a raw link into a named link
				const line = doc.getLineAt(at)
				const [start, end] = doc.getLineRange(line)

				const ops = line.content.ops
				let linkStart = start
				let linkEnd = end
				
				for (let i = 0; i < ops.length; i++) {
					const op = ops[i]
					const opLength = Op.length(op)
					if (op.attributes?.t_link?.form === 'raw') {
						linkEnd = linkStart + opLength

						if (linkStart <= at && linkEnd >= at) {
							break // Found it
						}
					}
					linkStart += opLength
				}

				editor.change
					.insert(linkStart, '[](')
					.insert(linkEnd, ')')
					.select(linkStart + 1)
					.apply()

				const preFetchSelection = editor.doc.selection
				const title = await workspace.api.links.getTitle(link.href)
				const postFetchSelection = editor.doc.selection
				if (postFetchSelection === preFetchSelection && title) {
					// Nothing changed since we fetched
					editor.change
						.insert(preFetchSelection[0], title)
						.select([preFetchSelection[0], preFetchSelection[0] + title.length])
						.apply()
				}
			}
			else {
				// Remove link
				const link = findLinkAround(doc, at, matchMarkdownLink)
				if (link) {
					const { start, end } = link
					editor.change
						.delete([start, start + 1])
						.delete([end - link.href.length - 3, end])
						.apply()
				}
			}
		}
		else {
			// Create link
			let textStart = at
			let textEnd = to

			let clipboardContents = ''
			try {
				clipboardContents = await navigator.clipboard.readText()
			}
			catch (e) {
				console.error('Could not read from the clipboard')
				console.log(e)
			}

			if (!clipboardContents || !clipboardContents.match(/\w+:\/\/.*/)) {
				// If it's not a link, don't bother
				clipboardContents = ''
			}

			if (at === to) {
				[textStart, textEnd] = findWordAroundPositionInDocument(doc, at)
				if (textStart === textEnd) return
			}

			const change = editor.change
				.insert(textStart, '[')
				.insert(textEnd, '](' + clipboardContents + ')')
			
			if (clipboardContents) {
				change.select(change.selection[0] + 1)
			}

			change.apply()
		}
	}

	function toggleWikiLink(event: ShortcutEvent) {
		const { doc } = editor
		const selection = normalizeRange(doc.selection)
		if (!selection) return
		const [at, to] = selection
		
		const activeFormats = doc.getFormats(selection)

		const link = activeFormats.t_link as HrefFormedLink
		// No stomping!
		if (link?.form === 'md' || link?.form === 'raw') return

		event.preventDefault()

		if (link?.form === 'wiki') {
			// Remove the link
			const link = findLinkAround(doc, at, (text, pos) => matchWikiLink(text, pos, { snipFormatCharacters: false }))
			if (link) {
				let startDeleteSize = 2
				let endDeleteSize = 2

				if (link.text) {
					startDeleteSize += link.href.length
					startDeleteSize += link.content_id?.length || 0
					startDeleteSize += 1 // For the '|' character
				}

				const { start, end } = link
				const change = editor.change
					.delete([start, start + startDeleteSize])
					.delete([end - endDeleteSize, end])
				change.select(change.transformSelection(selection))
				change.apply()
			}
		}
		else {
			// Create a link
			let linkStart = at
			let linkEnd = to

			if (at === to) {
				// link from word under selection
				[linkStart, linkEnd] = findWordAroundPositionInDocument(doc, at)
				if (linkStart === linkEnd) return
			}

			const text = doc.getText([linkStart, linkEnd])

			const resolution = resolveLink(workspace.directoryStore, {
				form: 'wiki',
				href: text
			})

			const change = editor.change

			if (resolution && !Array.isArray(resolution) && typeof resolution !== 'string') {
				// Adjust the text to match the actual resolved object
				if (text !== resolution.name) {
					change.delete([linkStart, linkEnd])
					change.insert(linkStart, resolution.name)
				}
			}

			change
				.insert(linkStart, '[[')
				.insert(linkEnd, ']]')
				.apply()

			if (!resolution || Array.isArray(resolution)) {
				// Could not resolve the resulting link, open autocomplete
				const autocomplete = editor.modules.autocomplete as AutocompleteModule
				autocomplete?.activateAutocomplete()
			}
			else {
				// Resolution was successful, jump to end of link
				editor.select(editor.doc.selection[1] + 2)
			}
		}
	}

	function toggleItalic(event: ShortcutEvent) {
		toggleInlineFormat(
			event,
			workspace?.settings?.italicsCharacters.value ?? '_',
			attr => attr?.italic)
	}

	function toggleBold(event: ShortcutEvent) {
		return toggleInlineFormat(
			event,
			workspace?.settings?.boldCharacters.value ?? '**',
			attr => attr?.bold)
	}

	function toggleHightlight(event: ShortcutEvent) {
		return toggleInlineFormat(
			event,
			'==',
			attr => attr?.highlight
		)
	}

	function toggleInlineCode(event: ShortcutEvent) {
		return toggleInlineFormat(
			event,
			'`',
			attr => attr?.inline_code
		)
	}

	function toggleInlineFormat(event: ShortcutEvent, formattingCharacters: string, predicate: AttributePredicate) {
		const { doc } = editor
		const selection = normalizeRange(doc.selection)
		if (!selection) return
		const [at, to] = selection
		event.preventDefault()

		const formatLength = formattingCharacters.length

		const ranges = getRangesIntersecting(doc, selection, predicate)
		if (ranges.length === 0 && at === to) {
			// Collapsed selection
			// check back
			const [start, end] = doc.getLineRange(at)
			let range: EditorRange = null
			if (start < at - 1) {
				range = getRangeWhile(doc, [at - 1, to], predicate, 'start')
			}
			if (!range && end > to + 1) {
				// check forward
				range = getRangeWhile(doc, [at, to + 1], predicate, 'end')
			}
			if (range) {
				ranges.push(range)
			}
		}
		if (ranges.length > 0) {
			// Toggle off
			const change = editor.change

			let newAt = at
			let newTo = to

			for (const range of ranges) {
				const [start, end] = range
				change
					.delete([start, start + formatLength])
					.delete([end - formatLength, end ])
				
				const atNormal = at - start
				const toNormal = to - start
				const length = end - start

				if (0 < atNormal && atNormal < formatLength) {
					newAt -= formatLength - atNormal
				}
				if (atNormal >= formatLength) {
					newAt -= formatLength
				}
				if (atNormal > length - formatLength) {
					const offset = length - atNormal
					if (offset > 0) {
						newAt -= Math.min(formatLength, offset)
					}
					else {
						newAt -= formatLength
					}
				}

				if (0 < toNormal && toNormal < formatLength) {
					newTo -= formatLength - toNormal
				}
				if (toNormal >= formatLength) {
					newTo -= formatLength
				}
				if (toNormal > length - formatLength) {
					const offset = length - toNormal
					if (offset > 0) {
						newTo -= Math.min(formatLength, offset)
					}
					else {
						newTo -= formatLength
					}
				}
			}

			change.select([newAt, newTo])
			change.apply()
		}
		else {
			// Toggle on
			let target = selection
			if (at === to) {
				target = findWordAroundPositionInDocument(doc, at)
			}
			const [start, end] = target

			const lineRanges = doc.getLineRanges(target)
			const change = editor.change
			let affectedLineCount = 0
			for (const lineRange of lineRanges) {
				const [lineStart, lineEnd] = lineRange

				if (doc.getText(lineRange).trim() === '') {
					// skip empty lines
					continue
				}

				affectedLineCount++
				const s = Math.max(start, lineStart)
				const e = Math.min(lineEnd - 1, end)
				change
					.insert(s, formattingCharacters)
					.insert(e, formattingCharacters)
			}

			if (at === to && start !== end && at === end) {
				// Selection was at the end of a word.
				// Shift selection _outside_ the inline format characters.
				change.select([at + formatLength, to + formatLength * 2])
			}
			else {
				// Shift selection so cursor position stays consistent
				change.select([at + formatLength, to + formatLength * affectedLineCount * 2 - 1])
			}

			change.apply()
		}
	}

	function toggleLineComment(event?: ShortcutEvent) {
		const { doc } = editor
		const selection = normalizeRange(doc.selection)
		if (!selection) return

		event?.preventDefault()

		const lines = doc.getLinesAt(selection)
		const change = editor.change
		let selectionStartOffset = 0
		let selectionEndOffset = 0

		let willComment: boolean = undefined

		for (const line of lines) {
			const lineRange = doc.getLineRange(line)
			const [start, end] = intersectRanges(selection, lineRange)

			// If you check for a comment at the first position in a line, it will not be there
			const checkPosition = start === lineRange[0] ? start + 1 : start

			const formats = doc.getTextFormat(checkPosition)
			const hasComment = formats.line_comment != null
			const willCommentLine = willComment ?? !hasComment
			if (willComment === undefined) {
				// The action of the first line defines what all other lines will do
				willComment = willCommentLine
			}

			const lineText = doc.getText(lineRange)
			if (!willCommentLine && hasComment) {
				// Uncomment
				// Don't match \s because we don't want to eat \n
				const commentMatch = lineText.match(/\/\/[ \t]?/)
				if (commentMatch) {
					const matchStart = lineRange[0] + commentMatch.index
					const matchLength = commentMatch[0].length
					change.delete([matchStart, matchStart + matchLength])

					if (start === selection[0]) {
						selectionStartOffset -= matchLength
					}
					selectionEndOffset -= matchLength
				}
			}
			else if (willCommentLine && !hasComment) {
				let startIndex = 0
				const spaceMatch = lineText.match(/^[ \t]*/)
				if (spaceMatch) {
					startIndex = spaceMatch[0].length
				}

				// Add comment
				change.insert(lineRange[0] + startIndex, '//')

				if (start === selection[0]) {
					selectionStartOffset += 2
				}
				selectionEndOffset += 2
			}
		}

		change.select([selection[0] + selectionStartOffset,
			selection[1] + selectionEndOffset])

		change.apply()
	}

	function setHeader(event: ShortcutEvent, level: number) {
		if (level <= 0) return
		return setLinePrefix(event, repeatString('#', level) + ' ')
	}

	function setLinePrefix(event: ShortcutEvent, newPrefix: string) {
		const { doc } = editor
		const selection = doc.selection
		if (!selection) return
		const [at, to] = doc.selection

		event.preventDefault()

		const lines = doc.getLinesAt(selection)
		const change = editor.change

		let selectionStartOffset = 0
		let selectionEndOffset = 0

		const delta = new Delta()
		let deltaStarted = false

		for (const line of lines) {
			const [start, end] = doc.getLineRange(line)

			if (!deltaStarted) {
				deltaStarted = true
				delta.retain(start)
			}

			const oldPrefix = getLineFormattingPrefix(line)

			if (oldPrefix.length) {
				delta.delete(oldPrefix.length)
			}
			else if (line.length === 1 && lines.length > 1) {
				delta.retain(line.length)
				continue
			}

			delta.insert(newPrefix)
			delta.retain((end - start) - oldPrefix.length)

			const prefixDiff = newPrefix.length - oldPrefix.length
			
			if (start + oldPrefix.length <= at) {
				selectionStartOffset += prefixDiff
			}
			if (start + oldPrefix.length <= to) {
				selectionEndOffset += prefixDiff
			}
		}

		change.delta = delta
		change.select([at + selectionStartOffset, to + selectionEndOffset])

		editor.update(change)
	}

	function swapLines(event: ShortcutEvent, direction: 1 | -1) {
		const { doc } = editor
		const selection = normalizeRange(doc.selection)
		if (!selection) return
		const [at, to] = doc.selection

		event.preventDefault()

		const lines = doc.getLinesAt(selection)
		const firstLine = lines[0]
		const lastLine = lines[lines.length - 1]
		const movingRange: EditorRange = [
			doc.getLineRange(firstLine)[0],
			doc.getLineRange(lastLine)[1]
		]

		// This operation uses raw Delta as the TextChange object was doing some really strange things.
		// Much easier to just place out exactly what I want to happen

		// Collect the delta ops for all affected lines
		const movingOps = new Delta()
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]
			for (const op of line.content.ops) {
				movingOps.push(op)
			}
			movingOps.insert('\n')
		}

		const movingRangeSize = movingOps.length()

		if (direction > 0) {
			// Moving down
			const nextIndex = doc.lines.indexOf(lastLine) + 1
			if (nextIndex >= doc.lines.length) return

			const targetLine = doc.lines[nextIndex]
			const insertionPoint = doc.getLineRange(targetLine)[1]

			let delta = new Delta()
				.retain(movingRange[0])		// Everything prior
				.delete(movingRangeSize)	// Where the content was
				.retain(targetLine.length)	// The line we're swapping with
				.concat(movingOps)			// Where the content is now
				.retain(doc.length)			// I could be more accurate here, this is easier

			editor.change
				.setDelta(delta)
				.select([
					insertionPoint + (at - movingRange[0]) - movingRangeSize,
					insertionPoint + (to - movingRange[0]) - movingRangeSize
				]).apply()
		}
		else {
			// Moving up
			const nextIndex = doc.lines.indexOf(firstLine) - 1
			if (nextIndex < 0) return

			const targetLine = doc.lines[nextIndex]
			const insertionPoint = doc.getLineRange(targetLine)[0]

			let delta = new Delta()
				.retain(insertionPoint)		// Everything prior
				.concat(movingOps)			// Where the content is now
				.retain(targetLine.length)	// The line we're swapping with
				.delete(movingRangeSize)	// Where the content was
				.retain(doc.length)			// I could be more accurate here, this is easier

			editor.change.setDelta(delta)
				.select([
					insertionPoint + (at - movingRange[0]),
					insertionPoint + (to - movingRange[0])
				]).apply()
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

		switch (event.modShortcut) {
			case 'Enter':
				return onEnter(event)
			case 'Backspace':
				return onBackspace(event)
			case 'Mod+K':
				return toggleLink(event)
			case 'Mod+Alt+K':
				return toggleWikiLink(event)
			case 'Mod+I':
				return toggleItalic(event)
			case 'Mod+B':
				return toggleBold(event)
			case 'Mod+=':
				return toggleHightlight(event)
			case 'Mod+\\':
				return toggleInlineCode(event)
			case 'Mod+/':
				return toggleLineComment(event)

			case 'Mod+1':
				return setHeader(event, 1)
			case 'Mod+2':
				return setHeader(event, 2)
			case 'Mod+3':
				return setHeader(event, 3)
			case 'Mod+4':
				return setHeader(event, 4)
			case 'Mod+5':
				return setHeader(event, 5)
			case 'Mod+6':
				return setHeader(event, 6)
			case 'Mod+0':
				return setLinePrefix(event, '')

			case 'Alt+ArrowUp':
				return swapLines(event, -1)
			case 'Alt+ArrowDown':
				return swapLines(event, 1)
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
						if (value && typeof value !== 'string' && !Array.isArray(value)) {
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

	function onPastePlaintext(event) {
		const doc = editor.doc
		const selection = doc.selection
		if (!selection) return
		const [start, end] = normalizeRange(selection)

		const change = editor.change
		if (start !== end) {
			change.delete([start, end])
		}
		change.insert(start, event.text)
		change.select(start + event.text.length)
		change.apply()
	}

	return {
		init() {
			editor.on('error', onError)
			editor.on('changing', onChanging)
			editor.on('decorate', onDecorate)
			
			editor.root.addEventListener('shortcut', onKeyDown)
			editor.root.addEventListener('mousedown', onMouseDown)
			editor.root.addEventListener('paste', onPaste)
			editor.root.addEventListener('pastePlaintext', onPastePlaintext)
		},
		destroy() {
			editor.off('error', onError)
			editor.off('changing', onChanging)
			editor.off('decorate', onDecorate)
			
			editor.root.removeEventListener('shortcut', onKeyDown)
			editor.root.removeEventListener('mousedown', onMouseDown)
			editor.root.removeEventListener('paste', onPaste)
			editor.root.removeEventListener('pastePlaintext', onPastePlaintext)
		},
		setNotePath(path) {
			filepath = path
		},
		setSmartParagraphBreaks(value) {
			smartParagraphBreaks = value
		},
		preventSelectionReveal(until: Promise<unknown>) {
			updateSelectionReveal = false
			;(until ?? wait()).then(() => {
				updateSelectionReveal = true
			})
		},
		toggleLineComment,
		toggleItalic,
		toggleBold
	}
}