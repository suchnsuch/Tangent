<script lang="ts">
import { setContext } from 'svelte'

import type WindowApi from 'common/WindowApi'

import Workspace from './model/Workspace'
import type { WorkspaceInitState } from 'common/workspaceState'

import WorkspaceView from './views/WorkspaceView.svelte'
import WorkspaceSelector from './WorkspaceSelector.svelte'
import { Focus } from './utils/focus'
import type { AnnotatedFocusEvent } from './utils/focus'
import MessageToast from './views/MessageToast.svelte'
import { isMac } from 'common/platform'
import { mailTo } from 'common/email'
import { mediaQueryStore } from './utils/svelte'
import SvgIcon from './views/smart-icons/SVGIcon.svelte'

import { dropAllTooltips, tooltips } from './utils/tooltips'
import Tooltip from './utils/Tooltip.svelte'
import { setTLinkTooltipComponent } from './views/editors/NoteEditor/t-link'
import TLinkTooltip from './views/editors/TLinkTooltip.svelte'
import { updateMermaidStyle } from './style/mermaidStyle'

// Doing this here so that mhchem is loaded
import 'katex/contrib/mhchem/mhchem'

let applicationState: 'initializing' | 'choosingWorkspace' | 'buildingWorkspace' | 'usingWorkspace' | 'error' = 'initializing'
let showLoading = false
let showLoadingTimeout: number = null
let workspace:Workspace = null
let errorDetails: {
	state: WorkspaceInitState,
	error: any
} = null 

let api = (window as any).api as WindowApi

if (isMac) {
	document.body.classList.add('mac')
}
else {
	document.body.classList.add('win')
}

setTLinkTooltipComponent(TLinkTooltip)

let selectionHistory: ({ element: HTMLElement, layer: string })[] = []
let reselectionTimeout: number

setContext('api', api)

const osDarkMode = mediaQueryStore('(prefers-color-scheme: dark)')
$: settingsMode = workspace?.settings.appearance
$: {
	const appearanceMode = (settingsMode != null && $settingsMode != 'system') ? $settingsMode : ($osDarkMode ? 'dark' : 'light')
	document.body.classList.remove('light', 'dark')
	document.body.classList.add(appearanceMode)

	updateMermaidStyle(appearanceMode === 'dark')
}

$: linkCursor = workspace?.settings.linkCursor
$: {
	const linkCursorMode = (linkCursor != null && $linkCursor) ?? 'directional'
	document.body.classList.remove('link-cursor-arrow', 'link-cursor-pointer', 'link-cursor-directional')
	document.body.classList.add('link-cursor-' + linkCursorMode)
}

$: noteLinkFollowBehavior = workspace?.settings.noteLinkFollowBehavior
$: {
	const behavior = (noteLinkFollowBehavior != null) ? $noteLinkFollowBehavior : 'mod'
	document.body.classList.remove('note-link-click-mod')
	document.body.classList.remove('note-link-click-none')

	document.body.classList.add('note-link-click-' + behavior)
}

$: linkClickPaneBehavior = workspace?.settings.linkClickPaneBehavior
$: {
	const linkPaneMode = (linkClickPaneBehavior != null && $linkClickPaneBehavior) ?? 'new'
	document.body.classList.remove('link-click-pane-new', 'link-click-pane-replace')
	document.body.classList.add('link-click-pane-' + linkPaneMode)
}

$: accentHue = workspace?.settings.accentHue
$: accentSaturation = workspace?.settings.accentSaturation
$: noteFont = workspace?.settings.noteFont
$: noteCodeFont = workspace?.settings.noteCodeFont
$: noteFontSize = workspace?.settings.noteFontSize
$: uiFontSize = workspace?.settings.uiFontSize
$: lineHeight = workspace?.settings.lineHeight
$: scrollBarWidth = workspace?.settings.scrollBarWidth
$: {
	let style = ''
	if (accentHue) {
		style += `--accentHue: ${$accentHue};`
	}
	if (accentSaturation) {
		style += `--accentSaturation: ${$accentSaturation}%;`
	}
	if (noteFont && $noteFont) {
		style += `--noteFontFamily: "${$noteFont}";`;
	}
	if (noteCodeFont && $noteCodeFont) {
		style += `--codeFontFamily: "${$noteCodeFont}";`;
	}
	if (noteFontSize) {
		style += `--fontSize: ${$noteFontSize}px;`
	}
	if (uiFontSize) {
		style += `font-size: ${$uiFontSize}px;`
	}
	if (lineHeight) {
		style += `--baseline: ${$lineHeight};`
	}
	if (scrollBarWidth) {

		let size = 4
		switch ($scrollBarWidth) {
			case "Small":
				size = 4
				break
			case "Medium":
				size = 8
				break
			case "Large":
				size = 12
				break
		}

		style += `--scrollBarWidth: ${size}px;`
	}

	document.body.style.cssText = style
}

window.addEventListener('beforeunload', () => {
	if (workspace) {
		workspace.shutdown()
	}
})
window.addEventListener('keydown', (event:KeyboardEvent) => {
	if (event.key === 'Meta') {
		document.body.classList.add('meta-pressed')
	}
	if (event.key === 'Control') {
		document.body.classList.add('ctrl-pressed')
	}
	if (event.key === 'Alt') {
		document.body.classList.add('alt-pressed')
	}
	if (event.key === 'Shift') {
		document.body.classList.add('shift-pressed')
	}
})
window.addEventListener('keyup', (event:KeyboardEvent) => {
	if (event.key === 'Meta') {
		document.body.classList.remove('meta-pressed')
	}
	if (event.key === 'Control') {
		document.body.classList.remove('ctrl-pressed')
	}
	if (event.key === 'Alt') {
		document.body.classList.remove('alt-pressed')
	}
	if (event.key === 'Shift') {
		document.body.classList.remove('shift-pressed')
	}
})

// Try to load a default workspace
api.getWorkspace().then(setState)
.catch(e => {
	console.error('Could not load default workspace.')
	console.log(e)
})

let title = 'Tangent'
async function setState(state: WorkspaceInitState) {
	if (showLoadingTimeout) {
		window.clearTimeout(showLoadingTimeout)
		showLoadingTimeout = null
	}
	if (state === null) {
		applicationState = 'choosingWorkspace'
		title = 'Select Workspace - Tangent'
	}
	else {
		console.log(state)
		try {
			workspace = new Workspace(state, api)

			applicationState = 'buildingWorkspace'
			title = workspace.directoryStore.files.name
			
			// Inject the workspace into the document
			const doc = document as any
			doc.workspace = workspace
			
			await workspace.startup()
			applicationState = 'usingWorkspace'
		}
		catch (e) {
			errorDetails = {
				state,
				error: e
			}
			applicationState = 'error'
			console.error('Tangent failed to initialize', e)
			return
		}
	}
}

async function onWorkspaceSelected(workspacePath: string) {
	console.log('Switching workspace to', workspacePath)
	applicationState = 'initializing'
	showLoading = false
	showLoadingTimeout = window.setTimeout(() => {
		showLoading = true
	}, 500)
	try {
		const workspaceState = await api.getWorkspace(workspacePath)
		setState(workspaceState)
	}
	catch (e) {
		console.error('Could not load the selected workspace.')
		console.log(e)
	}
}

function cleanSelectionHistory(exclude?: HTMLElement, layer?: string) {
	selectionHistory = selectionHistory.filter(h => {
		if (h.layer === layer) return false
		return h.element !== exclude && h.element.getRootNode() === document
	})
}

function onFocusIn(event: AnnotatedFocusEvent) {
	if (reselectionTimeout) {
		window.clearTimeout(reselectionTimeout)
		reselectionTimeout = null
	}
	if (event.target instanceof HTMLElement) {
		const layer = Focus.getLayer(event)
		cleanSelectionHistory(event.target, layer)
		selectionHistory.push({ element: event.target, layer })
	}
}

const refocusArgs = { preventScroll: true }
function onFocusOut(event: AnnotatedFocusEvent) {
	if (reselectionTimeout) {
		window.clearTimeout(reselectionTimeout)
		reselectionTimeout = null
	}

	const target = event.target

	if (target instanceof HTMLElement) {

		cleanSelectionHistory()
		
		reselectionTimeout = window.setTimeout(() => {
			if (selectionHistory[selectionHistory.length - 1]?.element === target) {
				selectionHistory.pop()
				const nextTarget = selectionHistory[selectionHistory.length - 1]
				console.log('Refocusing to', nextTarget)
				nextTarget?.element.focus(refocusArgs)
			}
		}, 100)
	}
	
}

// Do this so that child tooltips can have workspace context
function tooltipContextInjection(injector) {
	injector('workspace', workspace)
}

function getErrorEmail() {

	const { state, error } = errorDetails

	let body =`
Tangent v${state.version} failed to initialize.

Below is a stack trace of the error. Please provide any additional details above.\n\n` 

	if (error instanceof Error) {
		body += `${error.stack}`
	}
	else {
		body += 'Error: ' + error
	}

	return mailTo('contact@tangentnotes.com', {
		subject: `Tangent Initialization Error, v${state.version}`,
		body
	})
}

</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>
<svelte:body on:focusin={onFocusIn} on:focusout={onFocusOut} on:contextmenu={dropAllTooltips} />

{#if applicationState === 'initializing' && showLoading}
	<div class="loading">
		<SvgIcon
			ref="tangent-icon-nocolor.svg#icon"
			size="256"
			styleString="--iconStroke: var(--embossedBackgroundColor);"
			/>
		<span>Loading...</span>
	</div>
{:else if applicationState === 'buildingWorkspace'}
	<div class="loading">
		<SvgIcon
			ref="tangent-icon-nocolor.svg#icon"
			size="256"
			styleString="--iconStroke: var(--embossedBackgroundColor);"
			/>
		<span>Initial Setup...</span>
	</div>
{:else if applicationState === 'usingWorkspace'}
	<WorkspaceView {workspace} />
{:else if applicationState === 'choosingWorkspace'}
	<WorkspaceSelector {api} {onWorkspaceSelected} />
{:else if applicationState === 'error'}
	<div class="loading error">
		<SvgIcon
			ref="tangent-icon-nocolor.svg#icon"
			size="256"
			styleString="--iconStroke: var(--embossedBackgroundColor);"
			/>
		<p>Tangent encountered an issue while initializing.</p>
		<p>
			Please
			<a href={getErrorEmail()}>click here</a>
			to send an error report.
		</p>
	</div>
{/if}

<MessageToast {api} />

{#each $tooltips as {origin, originEvent, config} (origin)}
	<Tooltip {origin} {originEvent} {config} injectContext={tooltipContextInjection} />
{/each}

<style lang="scss">
.loading {
	position: absolute;
	inset: 0;

	font-size: 200%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: var(--deemphasizedTextColor);
	font-style: italic;

	&.error p {
		font-style: normal;
		margin-top: 1em;
		margin-bottom: 0;
		font-size: 1.2rem;
	}
}
</style>
