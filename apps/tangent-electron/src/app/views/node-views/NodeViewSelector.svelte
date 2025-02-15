<script lang="ts">
import { createEventDispatcher, getContext } from 'svelte'
import { fly, fade } from 'svelte/transition'
import { FocusLevel } from 'common/dataTypes/TangentInfo'
import paths from 'common/paths'
import { TreeNode } from 'common/trees'
import type { NavigationData } from 'app/events'
import type { NodeViewState } from 'app/model/nodeViewStates'
import type { ScrollToOptions } from 'app/utils/scrollto'
import Workspace from 'app/model/Workspace'
import SvgIcon from '../smart-icons/SVGIcon.svelte'
import './lensSettings.scss'

const typedDispatch = createEventDispatcher<{
	'navigate': NavigationData,
	'scroll-request': ScrollToOptions
}>()

const workspace = getContext('workspace') as Workspace

const { panelSettingsHoverHotspot } = workspace.settings

export var state: NodeViewState

export var isCurrent: boolean
export var focusLevel: FocusLevel = FocusLevel.Thread

export let layout: 'fill' | 'auto' = 'fill'
export let background: 'auto' | 'none' = 'auto'

/** The number of extra pixels to pad the top by */
export var extraTop: number = 0

$: lensState = state.currentLens
$: viewComponent = $lensState?.viewComponent
$: canShowSettings = state.settingsComponent != null ||
	$lensState?.settingsComponent != null

let hintSettings = false
let showSettingsFromMouse = false
let showSettingsFromHover = false
$: pinSettings = state.pinSettings
$: willPinSettings = (pinSettings && $pinSettings)
$: showSettings = showSettingsFromMouse || showSettingsFromHover || willPinSettings

let container: HTMLElement
let settingsContainer: HTMLElement

function onMouseMoveContainer(event: MouseEvent) {

	let { clientX, clientY } = event

	const rect = container.getBoundingClientRect()

	clientX -= rect.x
	clientY -= rect.y + extraTop

	const showThreshold = panelSettingsHoverHotspot.value
	const hintThreshold = showThreshold * 1.75

	hintSettings = clientY < hintThreshold
	if (layout === 'fill') {
		showSettingsFromMouse = clientY < showThreshold
	}
	else {
		showSettingsFromMouse = (rect.width - clientX) < showThreshold && clientY < showThreshold
	}
}

let hoverTimeout = null
function onSettingsEnter() {
	if (hoverTimeout) clearTimeout(hoverTimeout)
	showSettingsFromHover =  true
}
function onSettingsLeave() {
	hoverTimeout = setTimeout(() => {
		showSettingsFromHover = false
	}, 500)
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

</script>

<main
	bind:this={container}
	class={"NodeViewSelector" + getClassNamesForNode(state.node)  + ' ' + layout}
	on:mouseenter={_ => hintSettings = true}
	on:mouseleave={_ => hintSettings = false}
	on:mousemove={onMouseMoveContainer}
>
	{#if lensState && viewComponent}
		<svelte:component
			this={viewComponent}
			state={$lensState}
			{isCurrent}
			{focusLevel}
			{layout}
			{background}
			extraTop={willPinSettings ? settingsContainer?.getBoundingClientRect().height ?? extraTop : extraTop}
			on:navigate={e => typedDispatch('navigate', e.detail)}
			on:view-ready
			on:scroll-request={e => typedDispatch('scroll-request', e.detail)}
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
			<div
				bind:this={settingsContainer}
				class="settings-container"
				style:padding-top={extraTop + 4 + 'px'}
				on:mouseenter={onSettingsEnter}
				on:mouseleave={onSettingsLeave}
				on:click|preventDefault
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
</style>
