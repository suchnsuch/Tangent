import { Delta, deltaToText, Editor, type EditorRange, Line, normalizeRange, Op, ShortcutEvent, TextChange } from 'typewriter-editor'
import { type AttributePredicate, findWordAroundPositionInDocument, getRangesIntersecting, getRangeWhile, getSelectedLines, intersectRanges } from 'common/typewriterUtils'
import MarkdownEditor from './MarkdownEditor'
import { type HrefFormedLink } from 'common/indexing/indexTypes'
import { findLinkAround, matchMarkdownLink, matchWikiLink, resolveLink } from 'common/markdownModel/links'
import { getLineFormattingPrefix } from 'common/markdownModel/line'
import { repeatString } from '@such-n-such/core'
import { findSectionLines } from 'common/markdownModel/sections'
import { numberOf } from 'common/stringUtils'
import { getAutoChild, getDelimiterForGlyph, getGlyphForNumber, ListForm, listMatcher, matchList, splitCheckboxGlyphs, type ListDefinition } from 'common/markdownModel/list'
import { indentMatcher } from 'common/markdownModel/matches'

export function toggleInlineFormat(editor: Editor, selection: EditorRange, formattingCharacters: string, predicate: AttributePredicate, event?: Event) {
	const { doc } = editor
	selection = normalizeRange(selection)
	if (!selection) return
	const [at, to] = selection
	event?.preventDefault()

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

			if (lineRanges.length > 1 && doc.getText(lineRange).trim() === '') {
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
			change.select(at + formatLength * 2)
		}
		else {
			// Shift selection so cursor position stays consistent
			change.select([at + formatLength, to + formatLength * (affectedLineCount * 2 - 1)])
		}

		change.apply()
	}
}

export function toggleItalic(editor: MarkdownEditor, event?: Event) {
	toggleInlineFormat(
		editor,
		editor.doc.selection,
		editor.workspace?.settings?.italicsCharacters.value ?? '_',
		attr => attr?.italic,
		event
	)
}

export function toggleBold(editor: MarkdownEditor, event?: Event) {
	return toggleInlineFormat(
		editor,
		editor.doc.selection,
		editor.workspace?.settings?.boldCharacters.value ?? '**',
		attr => attr?.bold,
		event
	)
}

export function toggleHightlight(editor: MarkdownEditor, event?: Event) {
	return toggleInlineFormat(
		editor,
		editor.doc.selection,
		'==',
		attr => attr?.highlight,
		event
	)
}

export function toggleInlineCode(editor: MarkdownEditor, event?: Event) {
	return toggleInlineFormat(
		editor,
		editor.doc.selection,
		'`',
		attr => attr?.inline_code,
		event
	)
}

export async function toggleLink(editor: MarkdownEditor, selection: EditorRange, event?: Event) {
	const { doc, workspace } = editor
	selection = normalizeRange(selection)
	if (!selection) return
	const [at, to] = selection
	
	const activeFormats = doc.getFormats(selection)
	
	const link = activeFormats.t_link as HrefFormedLink
	// No stomping!
	if (link?.form === 'wiki') return

	event?.preventDefault()
	
	if (link) {
		if (link.form === 'raw') {
			if (!workspace) return
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

			// CommonMark feature https://spec.commonmark.org/0.31.2/#example-492
			const linkText = editor.getText([linkStart, linkEnd])
			const openCount = numberOf('(', linkText)
			const closeCount = numberOf(')', linkText)
			const needsBrackets = openCount != closeCount

			editor.change
				.insert(linkStart, needsBrackets ? '[](<' : '[](')
				.insert(linkEnd, needsBrackets ? '>)' : ')')
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
				let [from, to] = editor.doc.selection

				const secondMarkupStart = end - link.href.length - 3

				let change = editor.change
					.delete([start, start + 1])
					.delete([secondMarkupStart, end])

				let selectionFixup = (value) => {

					if (value > secondMarkupStart) {
						value -= value - (secondMarkupStart)
					}

					if (value > start) {
						// for the initial `[`
						value -= 1
					}

					return value
				}
				
				from = selectionFixup(from)
				to = selectionFixup(to)

				change.select([from, to])

				change.apply()
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

		if (clipboardContents) {
			const openCount = numberOf('(', clipboardContents)
			const closeCount = numberOf(')', clipboardContents)
			if (openCount != closeCount) {
				clipboardContents = '<' + clipboardContents + '>'
			}
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


/**
* @param event 
* @param mode 'name' uses the selected text as the name of the note to link to. 'display' uses the selected text as the display text.
*/
export function toggleWikiLink(editor: MarkdownEditor, selection: EditorRange, mode: 'name'|'display', event?: Event) {
	const { doc, workspace } = editor
	selection = normalizeRange(selection)
	if (!selection) return
	const [at, to] = selection
	
	const activeFormats = doc.getFormats(selection)

	const link = activeFormats.t_link as HrefFormedLink
	// No stomping!
	if (link?.form === 'md' || link?.form === 'raw') return

	event?.preventDefault()

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

		if (mode === 'name') {
			const resolution = workspace ? resolveLink(workspace.directoryStore, {
				form: 'wiki',
				href: text
			}) : null

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
				editor.autocomplete?.activateAutocomplete()
			}
			else {
				// Resolution was successful, jump to end of link
				editor.select(editor.doc.selection[1] + 2)
			}
		}
		else if (mode === 'display') {
			editor.change
				.insert(linkStart, '[[|')
				.insert(linkEnd, ']]')
				.select(linkStart + 2)
				.apply()
			
			editor.autocomplete?.activateAutocomplete()
		}
	}
}

export function toggleLineComment(editor: MarkdownEditor, event?: ShortcutEvent) {
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

type ToggleCheckboxTarget = 'create'|'apply'|'clear' | 'toggle'|'unify'
type ToggleCheckboxOptions = {
	targetMark?: string
	convertNonCheckbox?: boolean
	convertNonList?: boolean
	defaultListDelimiter?: string
	target?: ToggleCheckboxTarget
}

export function toggleCheckbox(editor: Editor, selection: EditorRange, options?: ToggleCheckboxOptions) {
	let addedCharactersCountEachLine: number[] = []

	const markToApply = options?.targetMark ?? 'x'
	const convertNonCheckbox = options?.convertNonCheckbox ?? true
	const convertNonList = options?.convertNonList ?? true
	const defaultListDelimiter = options?.defaultListDelimiter ?? '-'
	let target = options?.target ?? 'unify'

	const { doc, change } = editor
	const [selectionStart, selectionEnd] = normalizeRange(selection)

	const lineRanges = doc.getLineRanges([selectionStart, selectionEnd])

	if (target === 'unify') {
		const markToApplyInBox = ` [${markToApply}]`
		// Check all lines to determine what the actual action should be
		for (const lineRange of lineRanges) {
			const line = doc.getText(lineRange)
			if (!line.trim().length) continue // Skip empty lines

			const match = line.match(listMatcher)
			if (match) { // if the line was checkbox, toggle the state
				const checkBoxStr = match[8]
				if (checkBoxStr) {
					if (checkBoxStr !== markToApplyInBox) {
						target = 'apply'
					}
				}
				else if (convertNonCheckbox) {
					target = 'create'
					break
				}
			}
			else if (convertNonList) {
				target = 'create'
				break
			}
		}

		if (target === 'unify') target = 'clear' // All lines were checked, so we will uncheck them
	}

	function getTargetMark(currentMark: string|undefined): string {
		if (target === 'toggle') {
			if (currentMark == undefined) return ' '
			return currentMark === markToApply ? ' ' : markToApply
		}
		if (target === 'create') {
			if (!currentMark) return ' ' // Normalize non-checkboxes and `[]` checkboxes
			return currentMark // A call for creation does nothing to existing marks
		}
		if (target === 'clear') return ' '
		return markToApply
	}

	for (const lineRange of lineRanges) {
		const [lineStart, lineEnd] = lineRange

		const line = doc.getText(lineRange)
		if (!line.trim().length) continue // Skip empty lines

		let addedCharactersCount = 0

		const match = line.match(listMatcher)
		if (match) { // if the line was checkbox, toggle the state
			const checkBoxStr = match[8]
			if (checkBoxStr) { // if there was already a checkbox
				const checkBoxStart = match.index + match[0].indexOf(checkBoxStr)
				const head = lineStart + checkBoxStart + 1 // the index of [
				const tail = head + checkBoxStr.length - 1 // the index of ]
				const currentMark = doc.getText([head + 1, tail - 1])
				const targetMark = getTargetMark(currentMark)
				if (targetMark != currentMark) {
					const replacement = currentMark == targetMark ? ' ' : targetMark
					change.insert(head + 1, replacement)
					change.delete([head + 1, tail - 1])
					addedCharactersCount += replacement.length - currentMark.length // current content of checkbox may be empty like []
				}
			}
			else if (convertNonCheckbox) { // if there was already a list
				const listIndicatorStr = match[2]
				const listStart = match.index + match[0].indexOf(listIndicatorStr)
				const head = lineStart + listStart + 1 // start of list indicator
				const tail = head + listIndicatorStr.length - 1 // end of list indicator
				const glyph = `[${getTargetMark(undefined)}] `
				change.insert(tail + 1, glyph)
				addedCharactersCount += glyph.length
			}
		}
		else if (convertNonList) { // if line was not checkbox and not empty, make it a checkbox
			const firstNonSpaceIndex = line.length - line.trimStart().length
			const glyph = `${defaultListDelimiter} [${getTargetMark(undefined)}] `
			change.insert(lineStart + firstNonSpaceIndex, glyph)
			addedCharactersCount += glyph.length
		}

		addedCharactersCountEachLine.push(addedCharactersCount)
	}

	change.select([
		selectionStart + addedCharactersCountEachLine[0],
		selectionEnd + addedCharactersCountEachLine.reduce((a,b) => a+b, 0)
	])
	change.apply()
}

export function setLinePrefix(editor: MarkdownEditor, selection: EditorRange, newPrefix: string, event?: Event) {
	const { doc } = editor
	if (!selection) return
	const [at, to] = selection

	event?.preventDefault()

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

export function setHeader(editor: MarkdownEditor, level: number, event?: ShortcutEvent) {
	if (level <= 0) return
	return setLinePrefix(editor, editor.doc.selection, repeatString('#', level) + ' ', event)
}

export function shiftLines(editor: MarkdownEditor, event: Event, lines: Line[], shift: number) {
	if (!lines) return
	if (shift === 0) return
	const { doc } = editor
	const selection = normalizeRange(doc.selection)
	if (!selection) return
	const [at, to] = doc.selection

	event?.preventDefault()

	const firstLine = lines[0]
	const lastLine = lines[lines.length - 1]
	const movingRange: EditorRange = [
		doc.getLineRange(firstLine)[0],
		doc.getLineRange(lastLine)[1]
	]

	let listLinesToValidate: number[] = []
	function pushValidationIndex(lineIndex: number) {
		for (let i = 0; i < listLinesToValidate.length; i++) {
			const existing = listLinesToValidate[i]
			if (existing == lineIndex || existing == lineIndex - 1) return
			if (existing == lineIndex + 1) {
				listLinesToValidate[i] = lineIndex
				return
			}
		}
		listLinesToValidate.push(lineIndex)
	}

	let originalShiftingFirstLineIndex = doc.lines.indexOf(lines[0])

	let isInList = false // Use this to mark the beginning of each list block
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].attributes.list) {
			if (!isInList) {
				isInList = true
				pushValidationIndex(originalShiftingFirstLineIndex + i + shift)
			}
		}
		else {
			isInList = false
		}
	}

	// This operation uses raw Delta as the TextChange object was doing some really strange things.
	// Much easier to just place out exactly what I want to happen

	// Collect the delta ops for all affected lines
	const movingOps = new Delta()
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		for (const op of line.content.ops) {
			movingOps.push(op)
		}
		movingOps.insert('\n', line.attributes)
	}

	const movingRangeSize = movingOps.length()

	if (shift > 0) {
		// Moving down
		const lastIndex = doc.lines.indexOf(lastLine)
		const jumpStartIndex = lastIndex + 1
		const jumpEndIndex = lastIndex + shift
		if (jumpEndIndex >= doc.lines.length) return

		const jumpStartLine = doc.lines[jumpStartIndex]
		const jumpEndLine = doc.lines[jumpEndIndex]
		const insertionPoint = doc.getLineRange(jumpEndLine)[1]
		const jumpLength = insertionPoint - doc.getLineRange(jumpStartLine)[0]

		if (jumpStartLine.attributes.list) {
			pushValidationIndex(jumpStartIndex - lines.length)
		}

		let delta = new Delta()
			.retain(movingRange[0])		// Everything prior
			.delete(movingRangeSize)	// Where the content was
			.retain(jumpLength)	// The line we're swapping with
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
		const firstIndex = doc.lines.indexOf(firstLine)
		const jumpStartIndex = firstIndex + shift
		const jumpEndIndex = firstIndex - 1
		if (jumpStartIndex < 0) return

		// Ensure any ordered list being left behind is updated
		const postShiftLineIndex = doc.lines.indexOf(lines.at(-1)) + 1
		if (postShiftLineIndex < doc.lines.length && doc.lines[postShiftLineIndex].attributes.list) {
			pushValidationIndex(postShiftLineIndex)
		}

		const jumpStartLine = doc.lines[jumpStartIndex]
		const jumpEndLine = doc.lines[jumpEndIndex]
		const insertionStart = doc.getLineRange(jumpStartLine)[0]
		const jumpLength = doc.getLineRange(jumpEndLine)[1] - insertionStart
		
		let delta = new Delta()
			.retain(insertionStart)		// Everything prior
			.concat(movingOps)			// Where the content is now
			.retain(jumpLength)			// The line we're swapping with
			.delete(movingRangeSize)	// Where the content was
			.retain(doc.length)			// I could be more accurate here, this is easier

		editor.change.setDelta(delta)
			.select([
				insertionStart + (at - movingRange[0]),
				insertionStart + (to - movingRange[0])
			]).apply()
	}

	// Always start from the top
	listLinesToValidate.sort((a, b) => a - b)
	let textChange: TextChange = null
	for (let i = 0; i < listLinesToValidate.length; i++) {
		const targetIndex = listLinesToValidate[i]
		const targetLine = editor.doc.lines[targetIndex]

		let outTouchedLineIndices: number[] = []

		textChange = verifyListContext({
			id: targetLine.id,
			editor: editor,
			basis: 'rebasis',
			normalizeUnorderedGlyphs: false,
			targetIndent: targetLine.attributes.indent?.indent ?? '',
			autoSetChildGlyphs: false,

			outTouchedLineIndices
		}, textChange)

		// Don't process the same line twice
		for (const touchedIndex of outTouchedLineIndices) {
			if (touchedIndex === targetIndex) continue
			const pendingIndex = listLinesToValidate.indexOf(touchedIndex)
			if (pendingIndex >= 0) {
				listLinesToValidate.splice(pendingIndex, 1)
			}
		}
	}

	textChange?.apply()
}

export function shiftGroup(editor: MarkdownEditor, selection: EditorRange, event: Event, mode: 'lines'|'section', direction: -1 | 1) {
	const { doc } = editor
	if (!selection) return
	selection = normalizeRange(selection)
	const [at, to] = selection

	let lines: Line[]

	if (mode === 'section') {
		lines = findSectionLines(
			doc, selection,
			direction === -1 ? 'take-parent' : true
		).lines
	}
	else if (mode === 'lines') {
		lines = getSelectedLines(doc)
	}

	const collapsingSections = editor.collapsingSections

	{
		const lastIndex = doc.lines.indexOf(lines.at(-1))
		if (collapsingSections.lineHasCollapsedChildren(lastIndex)) {
			// Upgrade the movement to a section movement
			mode = 'section'

			// Extend the bottom of the selection if the bottom line has collapsed children
			for (let i = lastIndex + 1; i < doc.lines.length; i++) {
				if (!collapsingSections.lineIsCollapsed(i)) break
				lines.push(doc.lines[i])
			}
		}
	}

	// Find the next insertion point to jump the next section.
	let shift = mode === 'lines' ? direction : 0
	if (direction === -1) {
		const firstIndex = doc.lines.indexOf(lines[0])
		if (firstIndex === 0) return // Can't move up!
		if (mode === 'section') {
			const up = findSectionLines(doc, [doc.lines[firstIndex - 1], lines[0]], true, false)
			shift = -(up.lines.length - 1)
		}

		// Shift past any collapsed text
		for (let i = firstIndex + shift; i >= 0; i--) {
			if (!collapsingSections.lineIsCollapsed(i)) break
			shift--
		}
	}
	else {
		const lastIndex = doc.lines.indexOf(lines.at(-1))
		if (lastIndex === doc.lines.length - 1) return // Can't move down!
		if (mode === 'section') {
			const down = findSectionLines(doc, [lines.at(-1), doc.lines[lastIndex + 1]], false, true)
			shift = (down.lines.length - 1)	
		}
	}

	if (shift === 0) return // Can't move!

	// Allow collapsed pieces to remain collapsed

	const shouldPreventUncollapse = mode === 'section'

	if (shouldPreventUncollapse) collapsingSections.setUncollapseOnEdit(false)
	shiftLines(editor, event, lines, shift)
	if (shouldPreventUncollapse) collapsingSections.setUncollapseOnEdit(true)
}

interface VerifyListOptions {
	editor: MarkdownEditor,
	id: string,
	targetIndent: string,
	// Whether to apply the line's list format or incorporate into siblings'
	basis: 'self' | 'rebasis'
	// Whether to enforce that unordered glyphs are the same
	normalizeUnorderedGlyphs: boolean
	autoSetChildGlyphs?: boolean

	// When present, the line indices touched by this operation are added to this list
	outTouchedLineIndices?: number[]
}

export function verifyListContext(
	options: VerifyListOptions,
	change?: TextChange // An existing change to work with 
): TextChange {
	const { editor } = options
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
		for (let lineIndex = targetLineIndex - 1; lineIndex >= 0; lineIndex--) {
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
				if (lineIndex === targetLineIndex - 1 && (options.autoSetChildGlyphs ?? editor.workspace?.settings.autoSetChildListGlyphs.value ?? true)) {
					const listData = prevLine.attributes.list as ListDefinition
					if (listData) {
						const { form, glyph, basis } = getAutoChild(listData)
						targetForm = form
						targetGlyph = glyph
						basisNumber = basis
					}
				}
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

	const split = splitCheckboxGlyphs(targetGlyph)
	targetGlyph = split.base
	const hasCheckbox = split.box !== undefined

	function getTargetGlyph() {
		const targetDelimiter: string = getDelimiterForGlyph(targetGlyph)
		return getGlyphForNumber(targetForm, basisNumber, targetDelimiter) ?? targetGlyph
	}

	let offset = 0
	function offsetSelection(position: number, addition: number) {
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

	function enforceGlyphOnLine(listData: ListDefinition, lineStart: number, lineText: string) {
		const { base, box } = splitCheckboxGlyphs(listData.glyph)
		const targetBase = getTargetGlyph()

		let applyChange = false
		if (base !== targetBase) {
			if (options.normalizeUnorderedGlyphs) {
				applyChange = true
			}
			else if (targetForm !== listData.form || !(targetForm === ListForm.Unordered || targetForm === ListForm.UnorderedLarge)) {
				applyChange = true
			}
		}
		else if (!box && hasCheckbox) {
			applyChange = true
		}

		if (applyChange) {
			change = change || editor.change

			let finalTarget = targetBase
			if (box) finalTarget += ' ' + box
			else if (hasCheckbox) finalTarget += ' [ ]'

			const listMatch = lineText.match(listMatcher)
			const insertedText = listMatch[1] + finalTarget + ' '
			const sizeDiff = insertedText.length - listMatch[0].length
			const deleteEnd = lineStart + listMatch[0].length
			change
				.delete([lineStart, deleteEnd])
				.insert(deleteEnd, insertedText)

			didSomething = true
			
			offsetSelection(lineStart, sizeDiff)
			return true
		}
		return false
	}

	// Propagate the target form & basis to the indicated line
	if (targetListData && targetIndent === intendedIndent) {
		enforceGlyphOnLine(targetListData, targetRange[0], lineText)
		if (basisNumber) basisNumber++
		
		if (options.outTouchedLineIndices) {
			options.outTouchedLineIndices.push(targetLineIndex)
		}
	}

	// Propagate the target form & basis all following list lines on the indent level
	for (let lineIndex = targetLineIndex + 1; lineIndex < doc.lines.length; lineIndex++) {
		let nextLine = doc.lines[lineIndex]
		let nextText = deltaToText(nextLine.content)
		let indent = nextText.match(indentMatcher)[0]

		if (indent === intendedIndent) {
			const listData = nextLine.attributes.list as ListDefinition
			if (!listData) break // End of the road
			const lineRange = doc.getLineRange(nextLine)
			enforceGlyphOnLine(listData, lineRange[0], nextText)
			if (basisNumber) basisNumber++

			if (options.outTouchedLineIndices) {
				options.outTouchedLineIndices.push(lineIndex)
			}
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
