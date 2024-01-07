<script lang="ts">
import { createEventDispatcher, getContext, onDestroy, onMount, tick } from 'svelte'
import {
	addShortcutsToEvent,
	DecorateEvent,
	DecorationsModule,
	EditorChangeEvent,
	EditorRange,
	KeyboardEventWithShortcut,
	normalizeRange,
	Source,
	TextDocument
} from 'typewriter-editor'

import asRoot from 'typewriter-editor/lib/asRoot'
import { requestCallbackOnIdle, wait } from '@such-n-such/core'

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

import LinkInfoView from 'app/views/summaries/LinkInfoView.svelte'
import { pluralize } from 'common/plurals'
import arrowNavigate from 'app/utils/arrowNavigate'
import { HrefFormedLink, StructureType } from 'common/indexing/indexTypes'
import type { ConnectionInfo } from 'common/indexing/indexTypes'
import { areLineArraysOpTextEquivalent, getEditInfo, getLineRangeWhile, getRangeWhile, lineToText } from 'common/typewriterUtils'
import { scrollTo } from 'app/utils';
import { eventHasSelectionRequest, type NavigationData } from 'app/events'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte';
import TangentLink from './t-link';
import { appendContextTemplate, ContextMenuConstructorOptions } from 'app/model/contextmenu';
import { getInitialSelection } from 'common/markdownModel';
import { marginToAxis, ScrollToOptions } from 'app/utils/scrollto';
import { timedLatch } from 'app/utils/svelte';
import LazyScrolledList from 'app/utils/LazyScrolledList.svelte';
import { resolveLink } from 'common/markdownModel/links';
import type { Annotation } from 'common/nodeReferences';
import { ForwardingStore, subscribeUntil } from 'common/stores'
import type { NoteViewState } from 'app/model/nodeViewStates';
import { getActiveSentenceRange } from 'common/markdownModel/line';
import paths from 'common/paths';
import { NoteDetailMode } from 'app/model/nodeViewStates/NoteViewState';
import TagAutocompleter from '../autocomplete/TagAutocompleter';
import TagAutocompleteMenu from '../autocomplete/TagAutocompleteMenu.svelte';
    import { getPixelValue } from 'app/utils/style';

// Technically, this just needs to exist _somewhere_. Putting it here because of the svelte dependency
// Force the use of the variable so that it is included in the bundle
if (!TangentEmbed) {
	console.error('I don\'t have Embeds!')
}

const dispatch = createEventDispatcher<{
	'navigate': NavigationData
	'view-ready': undefined
	'scroll-request': ScrollToOptions
}>()

const workspace = getContext('workspace') as Workspace
const {
	noteMargins: margins,
	noteWidthMax: maxWidth,
	noteFontSize,
	hangingHeaders,
	smartParagraphBreaks,
	fixedTitle: fixedTitleSetting,
	letCodeExpand
} = workspace.settings

const editor = new MarkdownEditor(workspace)

let headerElement: HTMLElement
let headerEditElement: HTMLElement
let editorElement: HTMLElement
let detailsElement: HTMLElement

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

let container: HTMLElement

let _lastFile: NoteFile
let _lastFileLoadState: FileLoadState

let effectiveExtraTop = extraTop
let lastExtraTop = extraTop
let effectiveExtraBottom = extraBottom

let lastFocusLevel = focusLevel

let stats = ''

let isInitializing = false
let allowSelectionScroll = true
let saveTimeout = null
let hasSelection = false
let justScrolled = true
let editorIsFocused = false

let selectEndEnabled = true
let allowSelectionJump = true
let mouseDownX = 0
let mouseDownY = 0

let detailsOpened = false
let inLinks: ConnectionInfo[] = null
const showBacklinks = timedLatch(detailsOpened)
$: showBacklinks.update(detailsOpened)

$: note = state.note

let annotationHighlightTimeout: number = null
let allowAnnotationReactions = true
const annotations = new ForwardingStore<Annotation[]>([])
$: annotations.forwardFrom(state.annotations)

$: focusing = (focusLevel >= FocusLevel.Paragraph) && (layout !== 'fill' || hasSelection && !justScrolled)
$: virtual = $note.meta?.virtual

$: willFixTitle = (fixedTitle ?? $fixedTitleSetting) && focusLevel <= FocusLevel.File

editor.enabled = editable
editor.on('root', onEditorRoot)
editor.on('change', onEditorChange)
editor.on('decorate', onEditorDecorate)

editor.on('navigate', navigationForward)

const unsubs = [
	annotations.subscribe(updateAnnotations)
]

onMount(() => {
	if (container && state?.scrollY && layout === 'fill') {
		tick().then(() => {
			container.scrollTop = state.scrollY.value
		})
	}
})

function onEditorRoot() {
	editor.root.addEventListener('resumeFocus', resumeFocus)
	editor.root.addEventListener('navigate', navigationForward)

	updateDetails()
	
	editor.modules.tangent?.setNotePath(note.path)

	if (isCurrent) {
		tick().then(() => {
			if (state.selection && !editor.doc.selection) {
				resumeFocus()
			}
		})
	}

	smartParagraphBreaks.subscribe(v => editor.modules.tangent?.setSmartParagraphBreaks(v))
}

onDestroy(() => {
	if (note) {
		note.dropFile()
	}
	if (editor) {
		editor.root.removeEventListener('resumeFocus', resumeFocus)
		editor.root.removeEventListener('navigate', navigationForward)
		editor.off('root', onEditorRoot)
		editor.off('change', onEditorChange)
		editor.off('decorate', onEditorDecorate)

		editor.off('navigate', navigationForward)
		
		editor.destroy()
	}

	unsubs.forEach(i => i())
})

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
			_lastFileLoadState = 'unloaded'
			note.loadFile()
		}
		_lastFile = note

		editor.modules.tangent?.setNotePath(note.path)
		// No need to check for line equivalency: new note means new init
		skipLineCheck = true

		updateDetails()
	}
	if (skipLineCheck || !areLineArraysOpTextEquivalent(note.lines, editor.doc.lines)) {
		if (saveTimeout) {
			clearTimeout(saveTimeout)
		}
		if (note.lines.length > 0) {
			if (_lastFileLoadState !== note.loadState) {
				if (note.isReady) {
					if (_lastFileLoadState === 'unloaded') {
						// In theory, this only happens when the note was already
						// loaded, and thus ready to go as soon as this component
						// was mounted. In this case, we need to delay before dispatching,
						// otherwise the event is lost.
						tick().then(() => {
							// Delaying ensures that the event can be consumed
							// even when the component is first created
							dispatch('view-ready')
						})
					}
					else {
						// Otherwise, we're good to go
						dispatch('view-ready')
					}
				}
				
				_lastFileLoadState = note.loadState
			}

			const textDocument = new TextDocument(note.lines)

			if (editable) {
				isInitializing = true
				editor.set(textDocument, Source.api)
				isInitializing = false
			}
			else {
				editor.set(textDocument, Source.api)
			}
			
			if (isCurrent) {
				initializeSelection()
			}
			else if ($annotations?.length) {
				updateAnnotations($annotations)
			}
		}
	}
}

$: initializeSelection(headerEditElement, editorElement)
function initializeSelection(_h?, _e?) {
	isInitializing = true
	if (note && headerEditElement && editorElement && isCurrent) {
		if (note.loadState === 'new') {
			headerEditElement.focus()
			getSelection().selectAllChildren(headerEditElement)
		}
		else if (virtual && detailsElement) {
			openDetails()
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

function updateAnnotations(annotations: Annotation[]) {

	if (!editor._root || !note.isReady) {
		return
	}
	applyAnnotations()

	if (annotations && annotations.length) {
		window.clearTimeout(annotationHighlightTimeout)

		if (allowAnnotationReactions) {
			allowAnnotationReactions = false

			annotationHighlightTimeout = window.setTimeout(() => {
				const annotation = annotations[0]
				const range: EditorRange = [annotation.start, annotation.end]
				const bounds = editor.getBounds(range)
				const containerRect = container.getBoundingClientRect()
				annotationHighlightTimeout = null

				const bufferHeight = containerRect.height * .2
				
				if (containerRect.top + bufferHeight > bounds.top || containerRect.bottom - bufferHeight < bounds.bottom) {
					centerOnEditorRange(range, 500)
				}
			}, 100)

			editor.select(annotations[0].end)
			allowAnnotationReactions = true
		}
	}
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
	else {
		dispatch('scroll-request', options)
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

	// Shift annotations around based on the change
	const annos = $annotations
	if (changeEvent.change?.contentChanged && allowAnnotationReactions && annos && annos.length) {
		allowAnnotationReactions = false

		const editInfo = getEditInfo(changeEvent.change.delta)
		if (editInfo) {
			const newAnnotations: Annotation[] = []
			let edited = false

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

			if (edited) {
				$annotations = newAnnotations
			}
		}
		else {
			// Clear all to be safe
			$annotations = []
		}
		
		allowAnnotationReactions = true
	}

	if (editable) {
		if (editor.doc.selection) {
			state.selection = editor.doc.selection

			// Remove link-based annotations when selection changes
			const annos = $annotations
			if (allowAnnotationReactions && annos && annos.length) {
				allowAnnotationReactions = false
				const filtered = annos.filter(a => !('href' in a.data))
				if (filtered.length !== annos.length) {
					$annotations = filtered
				}
				allowAnnotationReactions = true
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

		if (container && focusLevel >= FocusLevel.Typewriter && allowSelectionJump) {
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
	
	if (state.detailMode) {
		requestCallbackOnIdle(updateDetails)
	}
}

function onEditorDecorate (event: DecorateEvent) {
	const doc = event.doc
	applyFocusDecorations(doc)
	applyAnnotations()

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
		const lines = doc.getLinesAt(selection)
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

function applyAnnotations() {
	const decorator = (editor.modules.decorations as DecorationsModule).getDecorator('annotations')
	decorator.clear()
	if (annotations && $annotations) {
		for (const annotation of $annotations) {
			let className = 'annotation'
			const groupNumber = annotation.data.group
			if (groupNumber !== undefined) {
				if (groupNumber === 0) {
					className += ' soft'
				}
				else {
					className += ' hard'
				}
			}
			decorator.decorateText([annotation.start, annotation.end], {
				class: className
			})
		}
	}
	decorator.apply()
}

function resumeFocus(arg?) {
	if (arg instanceof Event && virtual) {
		openDetails()
		return
	}

	if (!$note.isReady) {
		return // Will be ready later
	}

	if (headerEditElement !== document.activeElement && editorElement !== document.activeElement) {
		console.log('Resuming focus to ', note.name, state.selection)
		
		editorElement?.focus({
			preventScroll: true
		})
		if (state.selection) {
			editor.select(state.selection)
		}
		else {
			editor.select(getInitialSelection(editor.doc))
		}
	}
}

function onNoteKeydown(event: KeyboardEventWithShortcut) {
	if (event.defaultPrevented) return

	if (event.modShortcut === 'Mod+Alt+ArrowDown') {
		event.preventDefault()

		openDetails()
	}
}

function navigationForward(event: NavigationEvent) {
	const link = event.link
	if (!link.href && link.content_id) {
		if (state.highlightLink) state.highlightLink(link)
	}
	else {
		const { shiftKey, altKey } = event.incitingEvent

		dispatch('navigate', {
			link,
			origin: note,
			direction: altKey ? 'in' : (shiftKey ? 'replace' : 'out')
		})
	}
}

function navigateTo(event: Event, inLink: ConnectionInfo, direction: 'in' | 'out') {
	event.stopPropagation()
	let link: HrefFormedLink = {
		...inLink,
		href: inLink.from,
		form: 'raw', // Requireed as the from is a full path
		from: note.path
	}

	dispatch('navigate', {
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
	if (state.selection) {
		editor?.select(state.selection)
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
	allowSelectionJump = false
}

function onEditorMouseUp(event: MouseEvent) {
	allowSelectionJump = true
	if (focusLevel >= FocusLevel.Typewriter) {
		if (editor.doc.selection) {
			centerOnEditorRange(editor.doc.selection, 500)
		}
	}
}

function onEditorClick(event: MouseEvent) {
	const selectionRequest = eventHasSelectionRequest(event)
	if (selectionRequest) {
		const index = editor.getIndexFromPoint(event.clientX, event.clientY)
		editor.select(index)
	}
}

function onEditorDoubleClick(event: MouseEvent) {
	const selectionRequest = eventHasSelectionRequest(event)
	if (selectionRequest) {
		// Assume the previous click event set the index and select the whole thing
		const selection = editor.doc.selection

		let range: EditorRange = null

		if (selectionRequest.inline) {
			range = getRangeWhile(editor.doc, selection[0] - 1, selectionRequest.inline)
		}
		else if (selectionRequest.line) {
			range = getLineRangeWhile(editor.doc, selection[0] - 1, selectionRequest.line)
		}

		if (range) {
			if (selectionRequest.postProcessSelection) {
				range = selectionRequest.postProcessSelection(range)
			}
			editor.select(range)
		}
	}
}

function onContextMenu(event: MouseEvent) {
	// Holy sweet baby jesus this function though..
	const menu: ContextMenuConstructorOptions[] = []

	if (TangentLink.isTangentLinkEvent(event)) {
		const linkElement = TangentLink.getTangentLinkFromEvent(event)
		const linkInfo = linkElement.getLinkInfo()

		if (linkInfo.type !== StructureType.Embed) {
			editor.modules.tangent.preventSelectionReveal()
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
						dispatch('navigate', {
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
							dispatch('navigate', {
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
							dispatch('navigate', {
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
							dispatch('navigate', {
								link: linkInfo,
								origin: note,
								direction: 'replace'
							})
						}
					}
				)
			}
		}
		else if (linkState === 'untracked') {
			const filename = paths.basename(linkInfo.href)
			menu.push(
				{
					label: 'Open File',
					toolTip: `Opens "${filename}" in its default application.`,
					click: () => {
						dispatch('navigate', {
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
					dispatch('navigate', {
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
								if (value && typeof value !== 'string' && !Array.isArray(value)) {
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
		editor.select(editor.doc.length)
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
	const codeWrappers = editorElement?.querySelectorAll('pre')
	if (codeWrappers?.length) {
		const containerRect = container.getBoundingClientRect()

		for (let i = 0; i < codeWrappers.length; i++) {
			const pre = codeWrappers[i]
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

// Details
function updateDetails() {
	const detailMode = state.detailMode
	if ((detailMode & (NoteDetailMode.Words | NoteDetailMode.Characters)) === NoteDetailMode.None) {
		return	
	}

	const doc = editor?.doc
	if (doc) {
		let result = ''

		const text = doc.getText()

		if (NoteDetailMode.Words === (detailMode & NoteDetailMode.Words)) {
			result += pluralize(
				text.match(/\w+/g)?.length ?? 0,
				'$$ Words',
				'$$ Word',
				'No Words')
		}

		if (NoteDetailMode.Characters === (detailMode & NoteDetailMode.Characters)) {
			if (result.length > 0) result += ', '
			result += pluralize(
				text.length,
				'$$ Characters',
				'$$ Character',
				'No Characters, Yet')
		}

		stats = result
	}
}

function inLinkID(info: ConnectionInfo) {
	return `${info.from}_${info.start}-${info.end}`
}

$: updateInLinks(state, $note)
function updateInLinks(state, note) {
	if (NoteDetailMode.Details === (state.detailMode & NoteDetailMode.Details)) {
		const newLinks = note.meta?.inLinks
		if (newLinks !== inLinks) {
			inLinks = newLinks?.sort((a, b) => {
				if (a.from > b.from) {
					return 1
				}
				if (a.from < b.from) {
					return -1
				}
				return 0
			})
		}
	}
}

function toggleOpenDetails(event: MouseEvent) {
	if (NoteDetailMode.Details !== (state.detailMode & NoteDetailMode.Details)) {
		return
	}
	if (!detailsOpened) {
		openDetails()
	}
	else {
		detailsOpened = false
	}
}

function openDetails() {
	detailsOpened = true
	showBacklinks.update(detailsOpened)

	// Details need to be rendered in
	tick().then(() => {
		if (!detailsElement) return
		let target = detailsElement.querySelector('.inLinks .lazy-list-items :first-child')
		if (target instanceof HTMLElement) {
			target.focus({
				preventScroll: true
			})
		}
		else {
			let target = detailsElement.querySelector('.inLinks')
			if (target instanceof HTMLElement) {
				target.focus({ preventScroll: true })
			}
		}
	})
}

function onDetailKeydown(event: KeyboardEventWithShortcut) {
	if (event.defaultPrevented) return

	addShortcutsToEvent(event)

	if (event.key === 'Escape' || event.modShortcut === 'Mod+Alt+ArrowDown' || event.modShortcut === 'Mod+Alt+ArrowUp') {
		event.preventDefault()

		detailsOpened = false
		resumeFocus()
	}
}

function onDetailsContexMenu(event: MouseEvent) {
	appendContextTemplate(event, [
		{
			label: 'Open Backlink Documentation',
			click: () => {
				workspace.api.documentation.open('Backlinks')
			}
		}
	], 'bottom')
}

</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<main
	on:mousedown={onMouseDown}
	on:mouseup={selectEnd}
	on:wheel={onWheel}
	on:keydown={onNoteKeydown}
	on:focusin={e => detailsOpened = false}
	bind:this={container}
	class={`noteEditor layout-${layout} background-${background} margins-${$margins}`}
	class:editable={editable}
	class:hangingHeaders={$hangingHeaders}
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
		{focusing}
		preventMouseUpDefault={true}
		showExtension={false}
		on:enter-exit={e => editorElement.dispatchEvent(new Event('resumeFocus'))}
		/>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<article
		bind:this={editorElement}
		use:asRoot={editor}
		on:mousedown={onEditorMouseDown}
		on:mouseup|preventDefault={onEditorMouseUp}
		on:click={onEditorClick}
		on:dblclick={onEditorDoubleClick}
		on:focus={onEditorFocus}
		on:blur={onEditorBlur}
		on:contextmenu={onContextMenu}
		class="note"
		class:focusing
	></article>
	<div style={`height: ${effectiveExtraBottom}px;`}></div>
	<AutoCompleteMenu {editor} offset={4} let:handler>
		{#if handler instanceof WikiLinkAutocompleter}
			<WikiLinkAutocompleteMenu {handler} />
		{:else if handler instanceof TagAutocompleter}
			<TagAutocompleteMenu {handler} />
		{/if}
	</AutoCompleteMenu>
	{#if !editorIsFocused && virtual}
		<div class="noContentMessage" style:top={headerElement?.clientHeight + 150 + 'px'}>
			This note has no content. Click to add content.
		</div>
	{/if}
</main>

{#if state.detailMode}
{@const detailMode = state.detailMode}
{@const canOpenDetails = NoteDetailMode.Details === (detailMode & NoteDetailMode.Details)}
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="details"
	class:focusing
	class:open={detailsOpened}
	class:openable={canOpenDetails}
	bind:this={detailsElement}
	on:keydown={onDetailKeydown}
>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="detailsInfoBar detailsBlock"
		on:click={ toggleOpenDetails }>

		<span class="links">
			{#if NoteDetailMode.LinkSummary === (detailMode & NoteDetailMode.LinkSummary)}
				{pluralize(
					inLinks?.length ?? 0,
					'$$ Incoming Links',
					'$$ Incoming Link',
					'No Incoming Links')}
			{/if}
		</span>
		
		<span class="seperator"></span>
		<span class="stats">{stats}</span>
	</div>
	{#if canOpenDetails}
		<main on:contextmenu={onDetailsContexMenu}>
			{#if $showBacklinks}
				{#if inLinks?.length}
					<div class="inLinks detailsBlock"
						use:arrowNavigate={{
							containerSelector: '.lazy-list-items',
							scrollTime: 100
						}}
						tabindex="-1"
					>
						<LazyScrolledList items={inLinks} itemID={inLinkID}>
							<LinkInfoView
								slot="item"
								let:item={link}
								{link}
								target="from"
								className="button focusable"
								on:select={e => navigateTo(e, link, e.detail.direction)}
							/>
						</LazyScrolledList>
					</div>
				{:else}
					<div class="inLinks inLinks-empty detailsBlock" tabindex="-1">No Incoming Links</div>
				{/if}
			{/if}
		</main>
	{/if}
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
			background: linear-gradient(var(--noteBackgroundColor), 92%, transparent);
		}
	}
}

:global {
	.noteEditor {
		-webkit-user-select: auto;
		user-select: auto;
	}
}

article, .detailsBlock {
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
	position: absolute;
	left: 0;
	right: 0;
	text-align: center;
	color: var(--deemphasizedTextColor);
	opacity: .5;
}

.details {
	position: absolute;
	z-index: 10;
	left: 0;
	right: 0;
	bottom: 0;

	display: flex;
	flex-direction: column;

	transform: translateY(calc(100% - 24px));
	background: var(--noteBackgroundColor);

	transition: transform .5s, box-shadow .5s;

	max-height: 80%;
	overflow: hidden;

	&.open {
		transform: translateY(0);
		box-shadow: 0 0 10px rgba(0, 0, 0, .3);
	}

	main {
		overflow-y: auto;
		padding-bottom: 2em;
	}
}

.detailsInfoBar {
	font-size: 70%;
	box-sizing: border-box;
	height: 24px;
	width: 100%;
	padding: 4px 10px 4px 6px;
	flex-grow: 0;
	flex-shrink: 0;

	display: grid;
	grid-template-columns: max-content 1fr max-content;
	align-items: center;

	white-space: normal;
	transition: opacity .3s;

	.focusing:not(:hover) & {
		opacity: .5;
	}

	.seperator {
		flex-grow: 1;
	}
	
	.openable & {
		cursor: pointer;
	}
}

.inLinks :global(.lazy-list-items) {
	display: grid;
	grid-template-columns: .5fr .5fr;
	grid-auto-rows: auto;
	grid-auto-flow: dense;

	column-gap: 8px;
	row-gap: 8px;
	padding: 8px;

	> :global(*) {
		max-height: 12em;

		:global(.link-cursor-directional) & {
			cursor: e-resize;
		}
		:global(.link-cursor-directional.alt-pressed) & {
			cursor: w-resize;
		}
	}
}

.inLinks-empty {
	text-align: center;
	color: var(--deemphasizedTextColor);
	margin: 1em;
	font-style: italic;
}
</style>
