<script lang="ts">
import { getContext, tick } from 'svelte'
import { fly, fade } from 'svelte/transition'
import { FocusLevel } from 'common/dataTypes/TangentInfo'
import paths from 'common/paths'
import type { TreeNode } from 'common/trees'
import type { NavigationCallback, ViewReadyCallback } from 'app/events'
import type { DetailsViewState, NodeViewState } from 'app/model/nodeViewStates'
import type { ScrollToCallback } from 'app/utils/scrollto'
import { resizeObserver } from 'app/utils/resizeObserver'
import Workspace from 'app/model/Workspace'
import SvgIcon from '../smart-icons/SVGIcon.svelte'
import './lensSettings.scss'
import { timedLatch } from 'app/utils/svelte'
import DetailBacklinksView from './DetailBacklinksView.svelte'
import { pluralize } from 'common/plurals'
import { WorkspaceTreeNode } from 'app/model'
import { createCommandHandler } from 'app/model/commands/Command'
import { selectDetailsPane } from 'app/utils/selection'
import arrowNavigate, { isArrowNavigateEvent } from 'app/utils/arrowNavigate'

const workspace = getContext('workspace') as Workspace

const { panelSettingsHoverHotspot } = workspace.settings

export var state: NodeViewState

export var isCurrent: boolean
export var focusLevel: FocusLevel = FocusLevel.Thread

export let layout: 'fill' | 'auto' = 'fill'
export let background: 'auto' | 'none' = 'auto'

export let showDetails = true

/** The number of extra pixels to pad the top by */
export let extraTop = 0
export let extraBottom = 0

export let onNavigate: NavigationCallback
export let onScrollRequest: ScrollToCallback = null
export let onViewReady: ViewReadyCallback = null

$: node = state.node instanceof WorkspaceTreeNode ? state.node : null
$: lensState = state.currentLens
$: viewComponent = $lensState?.viewComponent
$: canShowSettings = state.settingsComponent != null ||
	$lensState?.settingsComponent != null

let hintSettings = false
let showSettingsFromMouse = false
let showSettingsFromHover = false
$: showSettingsState = state.showSettings
$: willShowSettings = (showSettingsState && $showSettingsState !== false)
$: showSettings = showSettingsFromMouse || showSettingsFromHover || willShowSettings

let container: HTMLElement
let settingsContainer: HTMLElement
let settingsHeight: number = extraTop
const settingsFocusSelector = '.arrowNavigate, .WorkspaceFileHeader .title'

let closeSettingsCommands = createCommandHandler([
	workspace.commands.openPaneSettings,
	workspace.commands.closePaneSettings
])
$: if (settingsContainer && willShowSettings && !settingsContainer.contains(document.activeElement)) {
	const target = settingsContainer.querySelector(settingsFocusSelector)
	if (target instanceof HTMLElement) target.focus()
	else settingsContainer.focus()
}

$: detailsState = state.details
$: canShowDetails = showDetails && node && detailsState != null
$: canOpenDetails = canShowDetails && $detailsState?.open !== null
$: areDetailsOpen = canShowDetails && $detailsState?.open
let detailsContainer: HTMLElement = null

const effectiveShowDetails = timedLatch(false)
$: effectiveShowDetails.update(areDetailsOpen)
$: if ($effectiveShowDetails && container) {
	tick().then(() => {
		selectDetailsPane(container)
	})
}

$: detailsComponent = getDetailsComponent($detailsState)
function getDetailsComponent(state: DetailsViewState) {
	if (!state?.tab || state.tab === 'backlinks') {
		return DetailBacklinksView
	}
	return null
}

let closeDetailsCommands = createCommandHandler([
	workspace.commands.openDetails,
	workspace.commands.closeDetails
])

function onSettingsResize(entries: ResizeObserverEntry[]) {
	const entry = entries[0]
	if (entry) {
		settingsHeight = entry.borderBoxSize[0].blockSize
	}
}

function onMouseEnterContainer(event: MouseEvent) {
	hintSettings = true
}

function onMouseLeaveContainer(event: MouseEvent) {
	hintSettings = false
	showSettingsFromMouse = false
}

function onMouseMoveContainer(event: MouseEvent) {

	let { clientX, clientY } = event

	const rect = container.getBoundingClientRect()

	clientX -= rect.x
	clientY -= rect.y + extraTop

	const showThreshold = panelSettingsHoverHotspot.value
	const hintThreshold = showThreshold * 2

	hintSettings = clientY < hintThreshold
	if (layout === 'fill') {
		showSettingsFromMouse = clientY < showThreshold
	}
	else {
		showSettingsFromMouse = (rect.width - clientX) < showThreshold && clientY < showThreshold
	}
}

function onFocusInContainer(event: FocusEvent) {
	if (detailsState && !detailsContainer.contains(document.activeElement)) {
		detailsState.update(details => {
			return {
				...details,
				open: false
			}
		})
	}
}

let settingsHoverTimeout = null
function onSettingsEnter() {
	if (settingsHoverTimeout) clearTimeout(settingsHoverTimeout)
	showSettingsFromHover =  true
}
function onSettingsLeave() {
	settingsHoverTimeout = setTimeout(() => {
		showSettingsFromHover = false
	}, 500)
}

let settingsFocusTimeout = null
function onSettingsKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented) {
		if (isArrowNavigateEvent(event)) {
			if (settingsFocusTimeout) clearTimeout(settingsFocusTimeout)
			showSettingsState?.set(true)
		}
		return
	}

	if (closeSettingsCommands(event) && state.focus) {
		state.focus(container)
		return
	}

	if (event.key === 'Escape') {
		event.preventDefault()
		workspace.commands.closePaneSettings.execute()
		state.focus(container)
		return
	}
}
function onSettingsFocusIn(event: FocusEvent) {
	if (settingsFocusTimeout) {
		clearTimeout(settingsFocusTimeout)
		if (event.target instanceof HTMLElement && event.target.matches('.arrowNavigate')) {
			event.target.classList.add('focusable')
		}
	}
}
function onSettingsFocusOut(event: FocusEvent) {
	if (!willShowSettings) return
	settingsFocusTimeout = setTimeout(() => {
		showSettingsState?.set(false)
		settingsFocusTimeout = null
	}, 50)
}

// This provides directory-scoped class names for custom css styling
function getClassNamesForNode(node: TreeNode) {
	let path = workspace.directoryStore.pathToPortablePath(node.path)
	if (node.fileType !== 'folder') {
		// Don't include the filename in this dance
		path = paths.dirname(path)
	}
	const segments = paths.segment(path)

	let classes = ''

	const chain = []

	for (let i = 0; i < segments.length; i++) {
		const cleanSegment = segments[i].replace(/[\W-]+/g, '_')
		const base = ' PATH_' + cleanSegment
		classes += base

		for (let j = 0; j < chain.length; j++) {
			chain[j] += '--' + cleanSegment
		}

		if (i < segments.length - 1) {
			chain.push(base)
		}
	}

	for (const c of chain) {
		classes += ' ' + c
	}

	return classes
}

function toggleOpenDetails() {
	if (!canOpenDetails) return
	if (areDetailsOpen) {
		detailsState.update(details => {
			return {
				...details,
				open: false
			}
		})
	}
	else {
		detailsState.update(details => {
			return {
				...details,
				open: true
			}
		})
	}
}

function onDetailKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented) return

	if (closeDetailsCommands(event) && state.focus) {
		state.focus(container)
	}
}

</script>

<main
	bind:this={container}
	class={"NodeViewSelector" + getClassNamesForNode(state.node)  + ' ' + layout}
	on:mouseenter={onMouseEnterContainer}
	on:mouseleave={onMouseLeaveContainer}
	on:mousemove={onMouseMoveContainer}
	on:focusin={onFocusInContainer}
>
	{#if lensState && viewComponent}
		<svelte:component
			this={viewComponent}
			state={$lensState}
			{isCurrent}
			{focusLevel}
			{layout}
			{background}
			extraTop={(showSettingsState && $showSettingsState === 'pin') ? settingsHeight ?? extraTop : extraTop}
			extraBottom={extraBottom + (canShowDetails ? 24 : 0)}
			{onNavigate}
			{onViewReady}
			{onScrollRequest}
		/>
	{:else}
		<div class="missing">
			<p class="missing">
				Tangent is not configured correctly to display {state.node.name}.
			</p>
			<p>If you see this, Taylor messed up.</p>
		</div>
	{/if}

	{#if canShowSettings}
		{#if isCurrent && focusLevel <= FocusLevel.Thread || hintSettings}
			<div class="settingsHint"
				style:top={extraTop + 'px'}
				transition:fade={{ duration: 100 }}
			>
				{#if layout=='fill'}
					<SvgIcon ref="settings-hint.svg#hint-down"
						size="16"
						styleString="opacity: .5;"/>
				{:else}
					<SvgIcon ref="settings-hint.svg#hint-down-left"
						size="16"
						styleString="opacity: .5;"/>
				{/if}
			</div>
		{/if}
		{#if showSettings}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				bind:this={settingsContainer}
				use:resizeObserver={onSettingsResize}
				use:arrowNavigate={{
					targetSelector: settingsFocusSelector,
					focusClass: 'focusable'
				}}
				tabindex="-1"
				class="settings-container"
				style:padding-top={extraTop + 4 + 'px'}
				on:mouseenter={onSettingsEnter}
				on:mouseleave={onSettingsLeave}
				on:click|preventDefault
				on:keydown={onSettingsKeydown}
				on:focusin={onSettingsFocusIn}
				on:focusout={onSettingsFocusOut}
				in:fly={{ duration: 200, y: -100 }}
				out:fly={{ duration: 700, y: -100 }}
			>
				<div class="settings">
					{#if state.settingsComponent}
						<svelte:component
							this={state.settingsComponent}
							state={state}
						>
							{#if $lensState?.settingsComponent}
								<svelte:component
									this={$lensState.settingsComponent}
									state={$lensState}
									/>
							{/if}
						</svelte:component>
					{:else if $lensState?.settingsComponent}
						<svelte:component
							this={$lensState.settingsComponent}
							state={$lensState}
							/>
					{/if}
				</div>
			</div>
		{/if}
	{/if}

	{#if canShowDetails}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			bind:this={detailsContainer}
			class="details"
			class:open={areDetailsOpen}
			class:openable={canOpenDetails}
			on:keydown={onDetailKeydown}
		>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="detailsInfoBar detailsBlock"
				on:click={toggleOpenDetails}
			>
				<span class="links">
					{pluralize(
						$node.meta?.inLinks?.length ?? 0,
						'$$ Incoming Links',
						'$$ Incoming Link',
						'No Incoming Links')}
				</span>
				<span class="separator"></span>
				{#if state.detailsSummaryComponent}
					<span class="node"><svelte:component
						this={state.detailsSummaryComponent}
						{state}
					/></span>
				{/if}
			</div>

			{#if $effectiveShowDetails && detailsComponent}
				<main>
					<svelte:component
						this={detailsComponent}
						{state}
						{onNavigate}
					/>
				</main>
			{/if}
		</div>
	{/if}
</main>

<style lang="scss">
main {
	&.fill {
		position: absolute;
		inset: 0;
	}
	&.auto {
		position: relative;
	}
}

.settingsHint {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	z-index: 9;
	text-align: center;

	background: linear-gradient();
}

.auto .settingsHint {
	text-align: right;
}

.settings-container {
	position: absolute;
	z-index: 10;
	top: 0;
	left: 4px;
	right: 4px;
	padding: 4px 1em;
	padding-right: 4px;

	background: var(--backgroundColor);

	font-size: smaller;

	border: 1px solid var(--borderColor);
	border-top: none;
	border-radius: var(--inputBorderRadius);
	box-shadow: 0 3px 5px -3px rgba(0, 0, 0, .3);

	display: flex;
}

.settings {
	flex-grow: 1;
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

.detailsBlock {
	white-space: pre-wrap;

	max-width: var(--noteWidthMax);
	box-sizing: border-box;
	margin: 0 auto;
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

	:global(.focusing) &:not(:hover) {
		opacity: .5;
	}

	.separator {
		flex-grow: 1;
	}
	
	.openable & {
		cursor: pointer;
	}
}
</style>
