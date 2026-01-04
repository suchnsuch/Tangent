<script lang="ts">
import { getContext, onDestroy, tick } from 'svelte'
import {
	DecorateEvent,
	type DecorationsModule,
	EditorChangeEvent,
	type EditorRange,
	type KeyboardEventWithShortcut,
	Line,
	normalizeRange,
	Source,
	TextDocument,
	asRoot
} from 'typewriter-editor'

import { wait } from '@such-n-such/core'

import type Workspace from "app/model/Workspace";
import type NoteFile from 'app/model/NoteFile'

import MarkdownEditor from './MarkdownEditor'

import TangentEmbed from './t-embed'
import type { NavigationEvent } from '../t-linkModule'
import WikiLinkAutocompleter from '../autocomplete/WikiLinkAutocompleter'
import AutoCompleteMenu from '../autocomplete/AutoCompleteMenu.svelte'
import WikiLinkAutocompleteMenu from '../autocomplete/WikiLinkAutocompleteMenu.svelte'
import type { FileLoadState } from 'app/model/File'
import { FocusLevel } from 'common/dataTypes/TangentInfo'
import { type HrefFormedLink, StructureType } from 'common/indexing/indexTypes'
import type { ConnectionInfo } from 'common/indexing/indexTypes'
import { areLineArraysOpTextEquivalent, type EditInfo, getEditInfo, getRangeWhile, rangesAreEquivalent, stripLineAttributes } from 'common/typewriterUtils'
import { scrollTo } from 'app/utils';
import { type NavigationCallback, type NavigationData, type ViewReadyCallback } from 'app/events'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte';
import { TangentLink } from './t-link';
import { appendContextTemplate, type ContextMenuConstructorOptions } from 'app/model/menus';
import { getInitialSelection } from 'common/markdownModel';
import { marginToAxis, type ScrollToCallback, type ScrollToOptions } from 'app/utils/scrollto';
import { resolveLink } from 'common/markdownModel/links';
import type { Annotation } from 'common/nodeReferences';
import { ForwardingStore, subscribeUntil } from 'common/stores'
import type { NoteViewState } from 'app/model/nodeViewStates';
import { getActiveSentenceRange } from 'common/markdownModel/line';
import paths from 'common/paths';
import TagAutocompleter from '../autocomplete/TagAutocompleter';
import TagAutocompleteMenu from '../autocomplete/TagAutocompleteMenu.svelte';
import { getPixelValue } from 'app/utils/style';
import UnicodeAutocompleter from '../autocomplete/UnicodeAutocompleter';
import UnicodeAutocompleteMenu from '../autocomplete/UnicodeAutocompleteMenu.svelte';
import CodeBlockAutocompleter from '../autocomplete/CodeBlockAutoCompleter';
import CodeBlockAutocompleteMenu from '../autocomplete/CodeBlockAutocompleteMenu.svelte';
import { handleIsNode } from 'app/model/NodeHandle';
import { revealContentAroundRange } from './editorModule';
import { fly } from 'svelte/transition';
import { derived } from 'svelte/store';
import { EmbedFile } from 'app/model';
import LineGutterLeft from './LineGutterLeft.svelte';
import LineGutterRight from './LineGutterRight.svelte';
import { dropTooltip, requestTooltip, type TooltipConfig } from 'app/utils/tooltips';
import YamlTooltip from './YamlTooltip.svelte';

// Technically, this just needs to exist _somewhere_. Putting it here because of the svelte dependency
// Force the use of the variable so that it is included in the bundle
if (!TangentEmbed) {
	console.error('I don\'t have Embeds!')
}

const workspace = getContext('workspace') as Workspace
const {
	noteMargins: margins,
	noteWidthMax: maxWidth,
	noteFontSize,
	hangingHeaders,
	crossOutFinishedTodos,
	smartParagraphBreaks,
	fixedTitle: fixedTitleSetting,
	letCodeExpand,
	linkClickPaneBehavior
} = workspace.settings

const editor = new MarkdownEditor(workspace)

let headerElement: HTMLElement
let headerEditElement: HTMLElement
let editorElement: HTMLElement

export let state: Pick<NoteViewState, 'note'> & Partial<NoteViewState>

export let isCurrent: boolean = false

export let layout: 'fill' | 'auto' = 'fill'
export let background: 'auto' | 'none' = 'auto'
export let allowOverscroll = true
export let editable: boolean = true
export let focusLevel: FocusLevel = FocusLevel.Thread

export let extraTop: number = 0
export let extraBottom: number = 0

export let fixedTitle: boolean = null
export let showHeaderIcon = false

export let onNavigate: NavigationCallback = null
export let onViewReady: ViewReadyCallback = null
export let onScrollRequest: ScrollToCallback = null

let container: HTMLElement

let _lastFile: NoteFile
let _lastFileLoadState: FileLoadState = null

let effectiveExtraTop = extraTop
let lastExtraTop = extraTop
let effectiveExtraBottom = extraBottom

let lastFocusLevel = focusLevel

let isInitializing = false
let allowSelectionScroll = true
let saveTimeout = null
let hasSelection = false
let justScrolled = true
let editorIsFocused = false

let selectEndEnabled = true
let isEditorMouseDown = false
let mouseDownX = 0
let mouseDownY = 0

$: note = state.note

let annotationHighlightTimeout: number = null
let allowAnnotationReactions = true // A flag that automatically shifts annotations when content is edited
let ignoreNextAnnotationUpdate = false
const annotations = new ForwardingStore<Annotation[]>([])
const annotationIndex = new ForwardingStore<number>(-1)
$: annotations.forwardFrom(state.annotations)
$: annotationIndex.forwardFrom(state.annotationIndex)
$: updateAnnotations($annotations, $annotationIndex)

$: focusing = workspace.viewState.focusing
$: if (isCurrent) {
	$focusing = (focusLevel >= FocusLevel.Paragraph) && (layout !== 'fill' || hasSelection && !justScrolled)
	console.log({ focusing: $focusing })
}

$: virtual = $note.meta?.virtual

$: willFixTitle = (fixedTitle ?? $fixedTitleSetting)

let fallbackErrors: Error[] = null

editor.enabled = editable
editor.on('root', onEditorRoot)
editor.on('change', onEditorChange)
editor.on('decorate', onEditorDecorate)
editor.on('error', onEditorError)

editor.on('navigate', navigationForward)

const unsubs: (() => void)[] = []

function onEditorRoot() {
	editor.root.addEventListener('resumeFocus', resumeFocus)
	editor.root.addEventListener('navigate', navigationForward)
	editor.root.addEventListener('mouseover', onEditorMouseOver)
	editor.root.addEventListener('mouseout', onEditorMouseOut)

	editor.modules.tangent?.setNotePath(note.path)

	if (state?.scrollY && layout === 'fill') {
		wait().then(() => {
			subscribeUntil(state.scrollY, scroll => {
				if (typeof scroll === 'number') {
					if (container) {
						container.scrollTop = scroll
					}
					return true
				}
			}, 1000)
		})
	}

	if (state?.collapsedLines) {
		subscribeUntil(derived([state.note, state.noteViewInfo], stores => stores), ([note, info]) => {
			if (note.isReady && info) {
				// Delay so that any render pass is complete
				tick().then(() => {
					editor.collapsingSections.setCollapsedStateStore(state.collapsedLines)	
				})
				return true
			}
		}, 1000)
	}

	if (isCurrent) {
		tick().then(() => {
			if (state.selection.value && !editor.doc.selection) {
				resumeFocus()
			}
		})
	}

	unsubs.push(
		smartParagraphBreaks.subscribe(v => editor.modules.tangent?.setSmartParagraphBreaks(v))
	)

	if (state.editor === null) {
		state.editor = editor
	}
}

onDestroy(() => {
	if (note) {
		note.dropFile()
	}
	if (editor) {
		editor.root.removeEventListener('resumeFocus', resumeFocus)
		editor.root.removeEventListener('navigate', navigationForward)
		editor.root.removeEventListener('mouseover', onEditorMouseOver)
		editor.root.removeEventListener('mouseout', onEditorMouseOut)
		editor.off('root', onEditorRoot)
		editor.off('change', onEditorChange)
		editor.off('decorate', onEditorDecorate)
		editor.off('error', onEditorError)

		editor.off('navigate', navigationForward)
		
		editor.destroy()
	}

	if (state.editor) {
		state.editor = null
	}

	for (const unsub of unsubs) {
		unsub()
	}
})

function onEditorError(error) {
	console.error("Tangent encountered a text editor error and will fall back to safe mode.", error)
	console.error(error.error)

	// Fall back to a safe mode
	editor.mainModule?.setFallbackMode(true)
	const lines = stripLineAttributes(editor.doc.lines)
	note.lines = lines
	editor.set(new TextDocument(lines, editor.doc.selection), 'api')
	fallbackErrors = [error]
}

function disableFallbackMode() {
	fallbackErrors = null
	// A delay gives the user the impression that something has indeed been attempted
	wait(500).then(() => {
		editor.mainModule?.setFallbackMode(false)
		note.onFileContentChanged(note.getFileContent())
	})
}

$: updateExtraSpace(extraTop, extraBottom, focusLevel, container)
function updateExtraSpace(et?, eb?, fl?, ct?) {
	effectiveExtraTop = extraTop
	effectiveExtraBottom = extraBottom

	if (container && layout === 'fill') {
		const containerHeight = container.getBoundingClientRect().height

		let proceduralHeight = allowOverscroll ? containerHeight - 88 : 0
		effectiveExtraBottom = Math.max(extraBottom, proceduralHeight)
		
		if (focusLevel > FocusLevel.File) {
			effectiveExtraTop = Math.max(extraTop, containerHeight * .5 - 88)
		}
	}

	if (focusLevel >= FocusLevel.Typewriter) {
		const delta = effectiveExtraTop != lastExtraTop ? effectiveExtraTop - lastExtraTop : 0

		// Chrome appears to be auto-adjusting scroll position when new
		// content is added above _but only when an element is scrolled_.
		// Therefore, check for that.
		if (Math.abs(delta) > 10 && container.scrollTop === 0) {
			tick().then(() => {
				const con = container
				con.scrollTop = container.scrollTop + delta
			})
		}

		if (editor.doc.selection) {
			wait().then(() => {
				centerOnEditorRange(editor.doc.selection, 500)
			})
		}
	}

	if (lastFocusLevel != focusLevel) {
		applyFocusDecorations(editor.doc)
		lastFocusLevel = focusLevel
		justScrolled = false
	}

	lastExtraTop = effectiveExtraTop
}

$: onFileChanged($note)
function onFileChanged(note: NoteFile) {
	let skipLineCheck = false
	if (note !== _lastFile) {
		// Don't want to be able to undo into oblivion
		editor.modules.history?.clearHistory()
		if (_lastFile) {
			_lastFile.dropFile()
		}
		if (note) {
			// An uninitialized last state represents the pass on initial mount
			if (_lastFileLoadState) _lastFileLoadState = 'unloaded'
			note.loadFile()
		}
		_lastFile = note

		editor.modules.tangent?.setNotePath(note.path)
		// No need to check for line equivalency: new note means new init
		skipLineCheck = true
	}
	if (skipLineCheck || !areLineArraysOpTextEquivalent(note.lines, editor.doc.lines)) {
		if (saveTimeout) {
			clearTimeout(saveTimeout)
		}

		const lines = note.lines

		if (lines.length > 0) {
			if (_lastFileLoadState !== note.loadState) {
				if (note.isReady) {
					if (_lastFileLoadState === null) {
						// In theory, this only happens when the note was already
						// loaded, and thus ready to go as soon as this component
						// was mounted. In this case, we need to delay before dispatching,
						// otherwise the event is lost.
						// TODO: Check if this is necessary in Svelte 5
						tick().then(() => {
							// Delaying ensures that the event can be consumed
							// even when the component is first created
							if (onViewReady) onViewReady()
						})
					}
					else {
						// Otherwise, we're good to go
						if (onViewReady) onViewReady()
					}
				}
				
				_lastFileLoadState = note.loadState
			}
		}

		const textDocument = new TextDocument(lines)

		try {
			if (editable) {
				isInitializing = true
				allowAnnotationReactions = false
				editor.set(textDocument, Source.api)
				allowAnnotationReactions = true
				isInitializing = false
			}
			else {
				editor.set(textDocument, Source.api)
			}
		}
		catch (error) {
			onEditorError(error)
		}
		
		if (lines.length) {
			if (isCurrent) {
				initializeSelection()
			}
			else if ($annotations?.length) {
				updateAnnotations($annotations)
			}
		}
	}

	// We're done with the onMount first pass; ensure the last state is a valid value
	if (!_lastFileLoadState) _lastFileLoadState = 'unloaded'
}

$: initializeSelection(headerEditElement, editorElement)
function initializeSelection(_h?, _e?) {
	isInitializing = true
	if (note && headerEditElement && editorElement && isCurrent) {
		if (note.loadState === 'new') {
			getSelection().selectAllChildren(headerEditElement)
			headerEditElement.focus()
		}
		else if ($annotations?.length) {
			updateAnnotations($annotations)
		}
		else {
			editorElement.dispatchEvent(new Event('resumeFocus'))
		}

		if (!editable) {
			editorElement.removeAttribute('contenteditable')
		}
	}
	isInitializing = false
}

function updateAnnotations(annotations: Annotation[], index=0) {

	if (!editor._root || !note.isReady) {
		return
	}
	applyAnnotations()

	if (annotations && annotations.length) {
		window.clearTimeout(annotationHighlightTimeout)

		if (allowAnnotationReactions && !ignoreNextAnnotationUpdate) {
			allowAnnotationReactions = false

			if (index < 0 || index >= annotations.length) {
				index = 0
			}

			annotationHighlightTimeout = window.setTimeout(() => {
				const annotation = annotations[index]
				const range: EditorRange = [annotation.start, annotation.end]
				const bounds = editor.getBounds(range)
				const containerRect = container.getBoundingClientRect()
				annotationHighlightTimeout = null

				const bufferHeight = containerRect.height * .2
				
				if (containerRect.top + bufferHeight > bounds.top || containerRect.bottom - bufferHeight < bounds.bottom) {
					centerOnEditorRange(range, 500)
				}
			}, 100)

			const selection = annotations[index].end
			if (document.activeElement === editorElement || (isCurrent && isInitializing)) {
				editor.select(selection)
			}
			else if (state.selection) {
				state.selection.set([selection, selection])
			}
			allowAnnotationReactions = true
		}
	}

	ignoreNextAnnotationUpdate = false
}

export function saveFile() {
	note.saveFile()
}

function setScrollTo(options: ScrollToOptions) {
	if (willFixTitle) {
		let marginY = marginToAxis(options.marginY ?? 0)
		marginY.start += headerElement.getBoundingClientRect().height
		options.marginY = marginY
	}

	if (layout === 'fill') {
		scrollTo(options)
	}
	else if (onScrollRequest) {
		onScrollRequest(options)
	}
}

function centerOnEditorRange(range: EditorRange, scrollTime?: number) {
	setScrollTo({
		container,
		target: editor.getBounds(range),
		duration: scrollTime,
		mode: 'center'
	})
}

function ensureRangeInView(range: EditorRange, buffer=50, scrollTime?: number) {
	if (!container || !editor) return

	setScrollTo({
		container,
		target: editor.getBounds(range),
		duration: scrollTime,
		marginY: buffer
	})
}

function onEditorChange(changeEvent: EditorChangeEvent) {

	// Manage annotation interactions
	const annos = $annotations
	if (allowAnnotationReactions && annos && annos.length) {
		allowAnnotationReactions = false

		let editInfo: EditInfo = null
		let invalidChange = false
		const contentChanged = changeEvent.change?.contentChanged
		if (contentChanged) {
			editInfo = getEditInfo(changeEvent.change.delta)
			if (!editInfo && changeEvent.change.delta.ops.find(o => 'delete' in o || 'insert' in o)) {
				invalidChange = true
			}
		}
		
		const newAnnotations: Annotation[] = []
		let edited = false
		if (!invalidChange) {

			function getIntersection(annotation: Annotation) {
				if (annotation.start > editInfo.offset + editInfo.shift) {
					return 'after'
				}
				if (annotation.end < editInfo.offset + editInfo.shift) {
					return 'before'
				}
				return 'intersects'
			}

			for (const annotation of annos) {

				if (editable && !contentChanged
					&& typeof annotation.data === 'object' && 'href' in annotation.data
					&& !rangesAreEquivalent(editor.doc.selection, state.selection.value)
				) {
					// Remove link-based annotations when selection change
					edited = true
					continue;
				}

				if (editInfo) {
					// Shift annotations around based on the change
					const intersection = getIntersection(annotation)
					switch (intersection) {
						case 'before':
							// Basically a no-op
							newAnnotations.push(annotation)
							break
						case 'after':
							// Shift this annotation
							newAnnotations.push({
								start: annotation.start + editInfo.shift,
								end: annotation.end + editInfo.shift,
								data: annotation.data
							})
							edited = true
							break
						case 'intersects':
							// Remove this annotation
							edited = true
							break
					}
				}
			}
		}

		if (invalidChange || edited) {
			ignoreNextAnnotationUpdate = true
			state.setAnnotations(newAnnotations)
		}
		
		allowAnnotationReactions = true
	}

	if (editable) {
		let selectionChanged = false
		if (editor.doc.selection) {
			if (!rangesAreEquivalent(editor.doc.selection, state.selection.value)) {
				selectionChanged = true
				state.selection.set(editor.doc.selection)
			}
			
			if (state.scrollY.value && container?.scrollTop) {
				wait().then(() => {
					state.scrollY.set(container.scrollTop)
				})
			}
		}

		if (changeEvent.changedLines?.length > 0) {
			// Only push updates to the note when real changes occur
			note.lines = editor.doc.lines
		}

		if (changeEvent.change?.delta?.ops.length > 0 && note.meta?.virtual) {
			// Quickly propegate the non-virtual nature of the note
			note.realizeFile()
		}

		if (selectionChanged) {
			if (container && focusLevel >= FocusLevel.Typewriter && !isEditorMouseDown) {
				if (changeEvent.doc.selection) {
					// Microtask means that layout is finished and the scroll appears to happen seemlessly
					queueMicrotask(() => centerOnEditorRange(changeEvent.doc.selection))

					// This fixes a bug where trying to jump the selection too much causes the mouseup event to
					// happen not on the editor. We don't want that.
					selectEndEnabled = false
					setTimeout(() => selectEndEnabled = true, 100)
				}
			}
			else if (changeEvent.doc?.selection && allowSelectionScroll) {
				queueMicrotask(() => ensureRangeInView(changeEvent.doc.selection))
			}
		}
		
		if (!isInitializing) {
			hasSelection = changeEvent.doc.selection != null
			justScrolled = false
		}

		if (saveTimeout) {
			window.clearTimeout(saveTimeout)
		}
		if (note.isDirty) {
			saveTimeout = window.setTimeout(saveFile, 5000)
		}

		workspace.dispatchEvent(new Event('editing'))
	}
}

function onEditorDecorate(event: DecorateEvent) {
	const doc = event.doc
	applyFocusDecorations(doc)
	applyAnnotations(event)

	if ($letCodeExpand) {
		tick().then(() => {
			updateCodeBlockSizing()
		})
	}
}

function applyFocusDecorations(doc: TextDocument) {
	const decorator = (editor.modules.decorations as DecorationsModule).getDecorator('focus')
	decorator.clear()
	const selection = normalizeRange(doc.selection)
	if (selection) {
		let lines = doc.getLinesAt(selection)

		if (lines.length && focusLevel === FocusLevel.Paragraph) {
			// Extend focus to adjacent qualifying lines
			function isValidLine(line: Line) {
				const attr = line.attributes
				return (!attr.empty && !attr.whitespace)
					|| attr.code
					|| attr.front_matter
					|| attr.math
			}

			const first = lines[0]
			if (isValidLine(first)) {
				const linesToAdd: Line[] = []
				let lineIndex = doc.lines.indexOf(first) - 1
				for (; lineIndex >= 0; lineIndex--) {
					const line = doc.lines[lineIndex]
					if (isValidLine(line)) {
						linesToAdd.push(line)
					}
					else {
						break
					}
				}

				if (linesToAdd.length) {
					linesToAdd.reverse()
					lines = [...linesToAdd, ...lines]
				}
			}

			const last = lines[lines.length - 1]
			if (isValidLine(last)) {
				const linesToAdd: Line[] = []
				let lineIndex = doc.lines.indexOf(first) + 1
				for (; lineIndex < doc.lines.length; lineIndex++) {
					const line = doc.lines[lineIndex]
					if (isValidLine(line)) {
						linesToAdd.push(line)
					}
					else {
						break
					}
				}

				if (linesToAdd.length) {
					lines = [...lines, ...linesToAdd]
				}
			}
		}

		for (const line of lines) {
			const [lineStart, lineEnd] = doc.getLineRange(line)

			// Not using a class here because there is a typewriter bug where new lines
			// are being stripped of their other classes.
			// Could fix, but solution is non-obvious; this is easy.
			decorator.decorateLine(lineStart, { 'data-focus': 'focused' })

			if (focusLevel >= FocusLevel.Sentence) {
				const [start, end] = getActiveSentenceRange(doc, line, selection)
				
				if (start > lineStart) {
					// "unfocus" the beginning of the paragraph
					decorator.decorateText([lineStart, start], { class: 'unfocused' })
				}

				// Focus the sentence
				decorator.decorateText([start, end], { class: 'focused' })

				if (end < lineEnd) {
					// "unfocus" the end of the paragraph
					decorator.decorateText([end, lineEnd], { class: 'unfocused' })
				}
			}
		}
	}
	decorator.apply()
}

function applyAnnotations(event?: DecorateEvent) {
	const decorator = (editor.modules.decorations as DecorationsModule).getDecorator('annotations')
	decorator.clear()
	if ($annotations) {

		function applyAnnotation(annotation: Annotation, current: boolean) {
			let className = 'annotation'
			if (current) {
				className += ' current'
			}
			const groupNumber = annotation.data.group
			if (groupNumber !== undefined) {
				if (groupNumber === 0) {
					className += ' soft'
				}
				else {
					className += ' hard'
				}
			}
			const range: EditorRange = [annotation.start, annotation.end]
			decorator.decorateText(range, {
				class: className
			})

			if (current) {
				// Reveal the current annotation
				revealContentAroundRange(event?.doc ?? editor.doc, range, decorator.change)
				decorator.change.formatText(range, { revealed: true })
			}
		}

		for (let i = 0; i < $annotations.length; i++) {
			if (i !== $annotationIndex) {
				applyAnnotation($annotations[i], false)
			}
		}

		// Apply the current annotation last so that it's on top
		if ($annotationIndex >= 0 && $annotationIndex < $annotations.length) {
			applyAnnotation($annotations[$annotationIndex], true)
		}
	}
	decorator.apply()
}

function resumeFocus(arg?) {
	if (arg instanceof Event && virtual) {
		// TODO: Some way of opening details automatically
		// openDetails()
		return
	}

	if (!$note.isReady) {
		return // Will be ready later
	}

	if (headerEditElement !== document.activeElement && editorElement !== document.activeElement) {
		console.log('Resuming focus to ', note.name, state.selection)
		
		allowAnnotationReactions = false
		editorElement?.focus({
			preventScroll: true
		})
		if (!state.selection.value) {
			editor.select(getInitialSelection(editor.doc))
		}
		allowAnnotationReactions = true
	}
}

function onNoteKeydown(event: KeyboardEventWithShortcut) {
	if (event.defaultPrevented) return

	if (event.modShortcut === 'Escape' && $annotations.length) {
		event.preventDefault()
		state.setAnnotations([])
		return
	}

	// TODO: Make into a proper command
	if (event.modShortcut === 'Mod+F') {
		event.preventDefault()
		const selection = editor.doc.selection
		if (selection && selection[0] != selection[1]) {
			state.setSearch(editor.doc.getText(selection))
		}
		else {
			state.setSearch()
		}
		return
	}
}

function navigationForward(event: NavigationEvent) {
	const link = event.link
	if (!link.href && link.content_id) {
		if (state.highlightLink) state.highlightLink(link)
	}
	else {
		const { shiftKey, altKey } = event.incitingEvent

		let direction: NavigationData['direction'] = 'out'
		if (altKey) {
			direction = 'in'
		}
		else {
			if (shiftKey !== (linkClickPaneBehavior.value === 'replace')) {
				direction = 'replace'
			}
		}

		console.log('Navigation forward')
		if (onNavigate) onNavigate({
			link,
			origin: note,
			direction
		})
	}
}

function navigateTo(inLink: ConnectionInfo, direction: 'in' | 'out') {
	let link: HrefFormedLink = {
		...inLink,
		href: inLink.from,
		form: 'raw', // Required as the from is a full path
		from: note.path
	}

	if (onNavigate) onNavigate({
		link,
		origin: note,
		direction
	})
}

function onWheel(event: WheelEvent) {
	if (!event.ctrlKey) {
		justScrolled = true
	}
	if (state.scrollY && layout === 'fill') {
		// I would like to do this when the note is unmounted
		// but that is not working for some reason
		requestAnimationFrame(() => {
			if (container) {
				state.scrollY.set(container.scrollTop)
			}
		})
	}
}

function onEditorFocus() {
	editorIsFocused = true
	// this allows clicks to bypass stored selection state while allowing
	// focus shifts with the keyboard to restore selection state.
	if (state.selection.value && !isEditorMouseDown) {
		editor?.select(state.selection.value)
	}
}

function onEditorBlur() {
	editorIsFocused = false
	if (!note.meta?.virtual) {
		if (saveTimeout) {
			window.clearTimeout(saveTimeout)
			saveTimeout = null
		}
		saveFile()
	}
}

function onMouseDown(event: MouseEvent) {
	mouseDownX = event.clientX
	mouseDownY = event.clientY
}

function onEditorMouseDown(event: MouseEvent) {
	isEditorMouseDown = true
}

function onEditorMouseUp(event: MouseEvent) {
	isEditorMouseDown = false
	if (focusLevel >= FocusLevel.Typewriter) {
		if (editor.doc.selection) {
			centerOnEditorRange(editor.doc.selection, 500)
		}
	}
}

//////////////////////////////////
// Custom tooltips from editor //
////////////////////////////////
let tooltipTarget: HTMLElement = null;

function getTooltipTarget(event: MouseEvent) {
	let target = event.target
	while (target instanceof HTMLElement) {
		const data = target.getAttribute('data-tooltip')
		const type = target.getAttribute('data-tooltip-type')
		if (data || type) {
			return target
		}
		target = target.parentElement
	}
}

function getTooltipConfig(target: HTMLElement): TooltipConfig {
	const message = target.getAttribute('data-tooltip')
	const type = target.getAttribute('data-tooltip-type')
	switch (type) {
		case 'yaml':
			return {
				tooltip: YamlTooltip,
				args: {
					message
				}
			}
	}
	
	return { tooltip: message }
}

function onEditorMouseOver(event: MouseEvent) {
	const target = getTooltipTarget(event)
	if (!target) return
	const config = getTooltipConfig(target)
	if (!config) return

	tooltipTarget = target
	requestTooltip(target, config, event)
}

function onEditorMouseOut(event: MouseEvent) {
	if (!tooltipTarget) return
	const target = getTooltipTarget(event)
	if (target !== tooltipTarget) {
		dropTooltip(tooltipTarget)
		tooltipTarget = null
	}
}

/////////////////////////////
// Line gutter adornments //
///////////////////////////
type LineTarget = { element: HTMLElement, index: number }
let leftHoverdLineTarget: LineTarget = null
let rightHoveredLineTarget: LineTarget = null

function onMouseMove(event: MouseEvent) {

	const bounds = editorElement.getBoundingClientRect()
	const lines = editorElement.querySelectorAll('.line')

	const count = lines.length

	let clearLeft = true
	let clearRight = true
	
	for (let i = 0 ; i < count; i++) {
		const lineElement = lines.item(i) as HTMLElement
		const lineBounds = lineElement.getBoundingClientRect()

		const leftBound = Math.min(bounds.left, lineBounds.left)
		const rightBound = Math.max(bounds.right, lineBounds.right)

		if (event.clientY > lineBounds.top && event.clientY <= lineBounds.bottom) {
			if (event.clientX > leftBound - 50 && event.clientX < lineBounds.left + 150) {
				if (leftHoverdLineTarget?.element !== lineElement) {
					leftHoverdLineTarget = {
						element: lineElement,
						index: i
					}
				}
				clearLeft = false
			}

			if (event.clientX > lineBounds.right - 150 && event.clientX < rightBound + 50) {
				if (rightHoveredLineTarget?.element !== lineElement) {
					rightHoveredLineTarget = {
						element: lineElement,
						index: i
					}
				}
				clearRight = false
			}
			break
		}
	}

	if (clearLeft) leftHoverdLineTarget = null
	if (clearRight) rightHoveredLineTarget = null
}

function onMouseLeave(event: MouseEvent) {
	if (leftHoverdLineTarget) leftHoverdLineTarget = null
	if (rightHoveredLineTarget) rightHoveredLineTarget = null
}
//// End ////

function onContextMenu(event: MouseEvent) {
	// Holy sweet baby jesus this function though..
	const menu: ContextMenuConstructorOptions[] = []

	if (TangentLink.isTangentLinkEvent(event)) {
		const linkElement = TangentLink.getTangentLinkFromEvent(event)
		const linkInfo = linkElement.getLinkInfo()

		if (linkInfo.type !== StructureType.Embed) {
			editor.mainModule.preventSelectionReveal()
			document.getSelection().selectAllChildren(linkElement)
		}

		const linkState = linkElement.getLinkState()

		if (linkState === 'resolved' || linkState === 'empty') {
			const resolution = resolveLink(workspace.directoryStore, linkInfo)

			if (typeof resolution === 'string') {
				// Will need to handle this with the native system
				menu.push({
					label: `Open "${linkInfo.href}"`,
					accelerator: 'CommandOrControl+Enter',
					toolTip: 'Opens the linked item in the default app',
					click: () => {
						if (onNavigate) onNavigate({
							link: linkInfo,
							origin: note
						})
					}
				})
			}
			else if (!Array.isArray(resolution)) {
				// Tangent knows what this is

				let actionName = ''
				let toolTipBase = ''

				if (linkState === 'empty') {
					actionName = 'Create New Note'
					toolTipBase = `Creates a new note named "${linkInfo.href}" `
				}
				else {
					actionName = 'Open File'
					toolTipBase = `Opens "${resolution.name}" `
				}

				menu.push(
					{
						label: `${actionName} to the Right`,
						accelerator: 'CommandOrControl+Enter',
						toolTip: toolTipBase + 'in a new pane to the right of this pane.',
						click: () => {
							if (onNavigate) onNavigate({
								link: linkInfo,
								origin: note
							})
						}
					},
					{
						label: `${actionName} to the Left`,
						accelerator: 'CommandOrControl+Alt+Enter',
						toolTip: toolTipBase + 'in a new pane to the right of this pane.',
						click: () => {
							if (onNavigate) onNavigate({
								link: linkInfo,
								origin: note,
								direction: 'in'
							})
						}
					},
					{
						label: `${actionName} Here`,
						accelerator: 'CommandOrControl+Shift+Enter',
						toolTip: toolTipBase + 'in the current pane.',
						click: () => {
							if (onNavigate) onNavigate({
								link: linkInfo,
								origin: note,
								direction: 'replace'
							})
						}
					}
				)

				if (resolution instanceof EmbedFile) {
					if (resolution.canCopyToClipboard()) {
						menu.push({
							command: workspace.commands.copyFileToClipboard,
							commandContext: { file: resolution }
						})
					}
				}
			}
		}
		else if (linkState === 'untracked') {
			const filename = paths.basename(linkInfo.href)
			menu.push(
				{
					label: 'Open File',
					toolTip: `Opens "${filename}" in its default application.`,
					click: () => {
						if (onNavigate) onNavigate({
							link: linkInfo
						})
					}
				},
				{
					label: 'Copy Path',
					toolTip: `Copy the path of "${filename}" to the clipboard.`,
					click: () => {
						const resolution = resolveLink(workspace.directoryStore, linkInfo)
						if (typeof resolution === 'string') {
							navigator.clipboard.writeText(resolution)
						}
					}
				}
			)
		}
		else if (linkState === 'external') {
			menu.push({
				label: 'Show in Browser',
				toolTip: 'Opens the link in your default browser.',
				click: () => {
					if (onNavigate) onNavigate({
						link: linkInfo,
						origin: note
					})
				}
			})

			menu.push({
				label: 'Copy URL',
				toolTip: 'Copies the link\'s url to your clipboard.',
				click: () => {
					navigator.clipboard.writeText(linkInfo.href)
				}
			})

			if (linkInfo.type === StructureType.Embed) {
				// TODO: Support this with all link types?
				menu.push({
					label: 'Save Locally',
					toolTip: 'Downloads a copy of the linked file and saves it to your workspace. The link is replaced with a link to that local file.',
					click: () => {
						// Select the text that will be replaced immediately
						const index = editor.getIndexFromPoint(event.clientX, event.clientY)
						const range = getRangeWhile(editor.doc, index - 1, attr => {
							return attr?.t_embed?.href === linkInfo.href
						})
						editor.select(range)

						// Request the save operation
						workspace.api.links.saveFromUrl(linkInfo.href, note.path).then(path => {
							if (!path) return

							subscribeUntil(workspace.getHandle(path), value => {
								if (handleIsNode(value)) {
									// Actually apply the new markup
									const workspacePath = workspace.directoryStore.getPathToItem(value, {
										length: 'short',
										includeExtension: true
									})

									if (range) {
										const insertion = `![[${workspacePath}${linkInfo.text ? '|' + linkInfo.text : ''}]]`
										const [start, end] = range

										editor.change
											.delete([start, end])
											.insert(start, insertion)
											.select(start + insertion.length)
											.apply()
									}

									return true
								}
								return false
							}, 5000)
						})
					}
				})
			}
		}
	}

	appendContextTemplate(event, menu)
	appendContextTemplate(event, [{
		label: 'Open Formatting Documentation',
		click: () => {
			workspace.api.documentation.open('Markdown Syntax')
		}
	}], 'bottom')
}

function selectEnd(event?: MouseEvent) {
	if (selectEndEnabled && !event?.defaultPrevented) {
		if (!event || (event.target != container && (event.target as HTMLElement).parentElement != container)) {
			return
		}
		if (mouseDownX !== event.clientX || mouseDownY !== event.clientY) {
			return
		}

		editor.root.focus({
			preventScroll: true
		})
		editor.select(editor.doc.length - 1)
	}
}

// Code Resizing
let resizeTimeout = null
let resizeObserver = new ResizeObserver(elements => {
	if (resizeTimeout) clearTimeout(resizeTimeout)
	resizeTimeout = setTimeout(() => updateCodeBlockSizing(), 200)
})
$: if ($letCodeExpand && editorElement) {
	resizeObserver.observe(editorElement)
}
else {
	resizeObserver.disconnect()
	// Burn down the styling
	const codeWrappers = editorElement?.querySelectorAll('pre')
	if (codeWrappers?.length) {
		for (let i = 0; i < codeWrappers.length; i++) {
			const pre = codeWrappers[i]
			pre.style.marginLeft = ''
			pre.style.marginRight = ''
		}
	}
}

function updateCodeBlockSizing() {
	// Do code funkery
	const codeWrappers = editorElement?.querySelectorAll('pre:not(.indented)')
	if (codeWrappers?.length) {
		const containerRect = container.getBoundingClientRect()

		for (let i = 0; i < codeWrappers.length; i++) {
			const pre = codeWrappers[i] as HTMLElement
			if (pre.scrollWidth > pre.clientWidth || pre.clientWidth > editorElement.clientWidth || pre.clientWidth > containerRect.width) {
				// I attempted multiple versions of caching here, but even a map of elements wasn't working correctly with the vdom malarky
				// This is probably slower than all of those, but it's working.
				// It may be that style hasn't recomputed even when properties have changed and so value are cached effectively?
				const preStyle = getComputedStyle(pre)
				const preMarginLeft = getPixelValue(preStyle.marginLeft)
				const preMarginRight = getPixelValue(preStyle.marginRight)

				// Need to revert the old margin
				const baseWidth = pre.clientWidth + preMarginLeft + preMarginRight

				const maxWidth = containerRect.width - $noteFontSize * 2

				const finalWidth = Math.min(pre.scrollWidth, maxWidth)
				const difference = finalWidth - baseWidth
				if (difference <= 0) continue

				const offset = difference * .5
				const margin = '-' + offset + 'px'
				pre.style.marginLeft = margin
				pre.style.marginRight = margin
			}
		}
	}
}

</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<main
	on:mousedown={onMouseDown}
	on:mouseup={selectEnd}
	on:mousemove={onMouseMove}
	on:mouseleave={onMouseLeave}
	on:wheel={onWheel}
	on:keydown={onNoteKeydown}
	bind:this={container}
	class={`noteEditor layout-${layout} background-${background} margins-${$margins}`}
	class:editable={editable}
	class:hangingHeaders={$hangingHeaders}
	class:crossOutFinishedTodos={$crossOutFinishedTodos}
	class:fixedTitle={willFixTitle}
	class:typewriter={focusLevel >= FocusLevel.Typewriter}
	style={`--noteWidthMax: ${$maxWidth}px;`}
	style:--extraTop={extraTop + 'px'}
>
	<div class="extraTop" style={`height: ${effectiveExtraTop}px;`}></div>
	<WorkspaceFileHeader
		node={$note}
		bind:headerElement
		bind:headerEditElement
		{editable}
		preventMouseUpDefault={true}
		showIcon={showHeaderIcon}
		showExtension={false}
		on:enter-exit={e => editorElement.dispatchEvent(new Event('resumeFocus'))}
		/>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<article
		bind:this={editorElement}
		use:asRoot={editor}
		on:mousedown={onEditorMouseDown}
		on:mouseup|preventDefault={onEditorMouseUp}
		on:focus={onEditorFocus}
		on:blur={onEditorBlur}
		on:contextmenu={onContextMenu}
		class="note"
		class:focusing={$focusing}
	></article>
	{#if (!editorIsFocused || !editable) && virtual}
		<div
			class="noContentMessage"
			style={'--noContentOffset: ' + (headerElement?.clientHeight + 150) + 'px;'}
		>
			This note is virtual and has no content.
			{#if editable}
				<br/>Click to add content.
			{/if}
		</div>
	{/if}
	<div style={`height: ${effectiveExtraBottom}px;`}></div>
	<AutoCompleteMenu {editor} offset={4} let:handler>
		{#if handler instanceof WikiLinkAutocompleter}
			<WikiLinkAutocompleteMenu {handler} />
		{:else if handler instanceof TagAutocompleter}
			<TagAutocompleteMenu {handler} />
		{:else if handler instanceof UnicodeAutocompleter}
			<UnicodeAutocompleteMenu {handler} />
		{:else if handler instanceof CodeBlockAutocompleter}
			<CodeBlockAutocompleteMenu {handler} />
		{/if}
	</AutoCompleteMenu>
	<LineGutterLeft {editor} target={leftHoverdLineTarget} />
	<LineGutterRight {editor} target={rightHoveredLineTarget} />
</main>

{#if fallbackErrors?.length}
<div class="fallbackWarning" style={`top: ${extraTop + 10}px;`}
	transition:fly={{y: -200}}
>
	<h1>Critical Error</h1>
	<p>
		Tangent encountered a critical error while processing this file.
		The editor has fallen back to plain-text editing mode.
	</p>
	<p>
		Please
		<a target="_blank" rel="noreferrer" href="https://github.com/suchnsuch/Tangent/issues/new">
			reach out to the developers
		</a>
		for support. Apologies for the inconvenience.</p>
	<div>
		<button
			title="Attempt to re-enable the normal editing mode. This may fail."
			on:click={disableFallbackMode}
		>
			Retry Normal Editing
		</button>
	</div>
</div>
{/if}

<style lang="scss">
main {
	position: relative;

	text-align: unset;

	&.layout-fill {
		position: absolute;
		inset: 0;

		overflow-x: hidden;
		overflow-y: auto;
	}

	&.background-auto {
		background-color: var(--noteBackgroundColor);
		border-top: 1px solid var(--borderColor);
	}

	&.editable {
		cursor: text;
	}

	&.fixedTitle {
		> :global(header) {
			position: sticky;
			top: var(--extraTop);
			z-index: 10;
			background: linear-gradient(var(--noteBackgroundColor) 92%, transparent);
		}

		> :global(header::before) {
			content: "";
			display: block;
			height: var(--extraTop);
			position: absolute;
			bottom: 100%;
			width: 100%;
			z-index: 10;
			background: var(--noteBackgroundColor);
		}
	}
}

:global {
	.noteEditor {
		-webkit-user-select: auto;
		user-select: auto;
	}
}

article {
	&:focus {
		outline: none;
	}
	white-space: pre-wrap;

	max-width: var(--noteWidthMax);
	box-sizing: border-box;
	margin: 0 auto;
}

:not(.typewriter) .extraTop {
	transition: height .5s;
}

.noContentMessage {
	text-align: center;
	color: var(--deemphasizedTextColor);
	opacity: .5;

	.layout-fill & {
		position: absolute;
		left: 0;
		right: 0;
		top: var(--noContentOffset);
	}
}

.fallbackWarning {
	position: absolute;
	right: 10px;

	border: 2px solid red;
	background: darkred;
	color: white;
	border-radius: var(--inputBorderRadius);

	max-width: max(25%, 26em);
	padding: 1em;

	font-size: 80%;

	h1 {
		font-size: 1.1em;
		margin-top: 0;
	}
}
</style>
