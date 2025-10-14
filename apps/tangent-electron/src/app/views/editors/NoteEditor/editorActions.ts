import { Delta, Editor, EditorRange, Line, normalizeRange, Op, ShortcutEvent } from 'typewriter-editor'
import { AttributePredicate, findWordAroundPositionInDocument, getRangesIntersecting, getRangeWhile, getSelectedLines, intersectRanges } from 'common/typewriterUtils'
import MarkdownEditor from './MarkdownEditor'
import { HrefFormedLink } from 'common/indexing/indexTypes'
import { findLinkAround, matchMarkdownLink, matchWikiLink, resolveLink } from 'common/markdownModel/links'
import { getLineFormattingPrefix } from 'common/markdownModel/line'
import { repeatString } from '@such-n-such/core'
import { findSectionLines } from 'common/markdownModel/sections'

function toggleInlineFormat(editor: Editor, formattingCharacters: string, predicate: AttributePredicate, event?: Event) {
	const { doc } = editor
	const selection = normalizeRange(doc.selection)
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
		editor.workspace?.settings?.italicsCharacters.value ?? '_',
		attr => attr?.italic,
		event
	)
}

export function toggleBold(editor: MarkdownEditor, event?: Event) {
	return toggleInlineFormat(
		editor,
		editor.workspace?.settings?.boldCharacters.value ?? '**',
		attr => attr?.bold,
		event
	)
}

export function toggleHightlight(editor: MarkdownEditor, event?: Event) {
	return toggleInlineFormat(
		editor,
		'==',
		attr => attr?.highlight,
		event
	)
}

export function toggleInlineCode(editor: MarkdownEditor, event?: Event) {
	return toggleInlineFormat(
		editor,
		'`',
		attr => attr?.inline_code,
		event
	)
}

export async function toggleLink(editor: MarkdownEditor, event?: Event) {
	const { doc, workspace } = editor
	const selection = normalizeRange(doc.selection)
	if (!selection || !workspace) return
	const [at, to] = selection
	
	const activeFormats = doc.getFormats(selection)
	
	const link = activeFormats.t_link as HrefFormedLink
	// No stomping!
	if (link?.form === 'wiki') return

	event?.preventDefault()
	
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
export function toggleWikiLink(editor: MarkdownEditor, mode: 'name'|'display', event?: ShortcutEvent) {
	const { doc, workspace } = editor
	const selection = normalizeRange(doc.selection)
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

export function setLinePrefix(editor: MarkdownEditor, newPrefix: string, event?: ShortcutEvent) {
	const { doc } = editor
	const selection = doc.selection
	if (!selection) return
	const [at, to] = doc.selection

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
	return setLinePrefix(editor, repeatString('#', level) + ' ', event)
}

export function shiftLines(editor: MarkdownEditor, event: ShortcutEvent, lines: Line[], shift: number) {
	if (!lines) return
	if (shift === 0) return
	const { doc } = editor
	const selection = normalizeRange(doc.selection)
	if (!selection) return
	const [at, to] = doc.selection

	event.preventDefault()

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
}

export function shiftGroup(editor: MarkdownEditor, event: ShortcutEvent, mode: 'lines'|'section', direction: -1 | 1) {
	const { doc } = editor
	const selection = normalizeRange(doc.selection)
	if (!selection) return
	const [at, to] = doc.selection

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
