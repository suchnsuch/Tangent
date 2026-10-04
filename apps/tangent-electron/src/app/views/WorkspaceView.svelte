<script lang="ts">
import { setContext } from 'svelte'
import { writable } from 'svelte/store'
import { wait } from '@such-n-such/core'

import type Workspace from 'app/model/Workspace'
import { FocusLevel } from 'common/dataTypes/TangentInfo'
import { SidebarMode } from 'common/SidebarState'

import WindowBar from '../WindowBar.svelte'
import TangentView from './Tangent/TangentView.svelte'
import System from './System/System.svelte'

import command from 'app/model/commands/CommandAction'
import FocusLevelIcon from './smart-icons/FocusLevelIcon.svelte'
import { appendContextTemplate, buildMainMenu, type ExtendedContextEvent, extractRawTemplate, prepareMainMenuForWindow } from 'app/model/menus'
import { isMac } from 'common/platform'
import CreationRuleName from './summaries/CreationRuleName.svelte'
import PopUpButton from 'app/utils/PopUpButton.svelte'
import { countPopUps } from 'app/utils/popUpButton'
import ModalStateView from 'app/modal/ModalStateView.svelte'
import LeftSidebar from './LeftSidebar.svelte'
import SvgIcon from './smart-icons/SVGIcon.svelte'
import ThreadHistoryListView from './summaries/ThreadHistoryListView.svelte'
import { createCommandHandler } from 'app/model/commands/Command'
import { shortcutDisplayString } from 'app/utils/shortcuts'

let {
	workspace
} : {
	workspace: Workspace
} = $props()

// svelte-ignore state_referenced_locally
setContext('workspace', workspace)

// svelte-ignore state_referenced_locally
let focusLevel = workspace.viewState.tangent.focusLevel
// svelte-ignore state_referenced_locally
let targetFocusModeLevel = workspace.viewState.targetFocusModeLevel
// svelte-ignore state_referenced_locally
let focusing = workspace.viewState.focusing

// It is dumb I have to do this instead of class:focusing={$focusing}
$effect(() => {
	if ($focusing) {
		document.body.classList.add('focusing')
	}
	else {
		document.body.classList.remove('focusing')
	}
})
let topCommandHandler = $derived(createCommandHandler(
	Object.values(workspace.commands)
	.filter(c => !c.group || c.group === 'Pane')
))

// Top bar
let hoveringForTopBar = $state(false)
let topBarShouldBeVisible = $state(false)
let topBarPopupCount = writable(0)
// svelte-ignore state_referenced_locally
let systemMenuIsOpen = workspace.viewState.system.showMenu
// svelte-ignore state_referenced_locally
workspace.on('editing', () => {
	// This is cheeky, but it works!
	if ($focusLevel >= FocusLevel.File) {
		topBarShouldBeVisible = false
	}
})

$effect(() => {
	// A cursed latch, but it works!
	topBarShouldBeVisible = topBarShouldBeVisible
		|| $focusLevel <= FocusLevel.Thread
		|| hoveringForTopBar
		|| leftSidebarVisible
		|| $topBarPopupCount > 0
})

// Sidebar
// svelte-ignore state_referenced_locally
let sidebarHoverHotspot = workspace.settings.sidebarHoverHotspot
// svelte-ignore state_referenced_locally
let leftSidebarMode = workspace.viewState.leftSidebar.mode
let leftSidebarSize = $state(100)

let leftSidebarVisible = $state($leftSidebarMode === SidebarMode.pinned)
// svelte-ignore state_referenced_locally
let lastLeftSidebarShouldBeVisible = leftSidebarVisible
let shouldDelayClosingSidebar = false

let hoveringForLeftSidebar = $state(false)
let hoveringOverLeftSidebar = $state(false)
let leftSidebarHasFocus = $state(false)

let resizingLeftSidebar = $state(false)

let leftSidebarVisibilityTimeout = null

$effect(() => {
	if ($leftSidebarMode === SidebarMode.closed) {
		leftSidebarVisible = lastLeftSidebarShouldBeVisible = false

		if (leftSidebarVisibilityTimeout) {
			clearTimeout(leftSidebarVisibilityTimeout)
		}

		leftSidebarVisibilityTimeout = setTimeout(() => {
			$leftSidebarMode = SidebarMode.hoverable
		}, 600)
	}
	else {
		let shouldBeVisible = ($leftSidebarMode === SidebarMode.pinned
			|| hoveringForLeftSidebar
			|| hoveringOverLeftSidebar
			|| leftSidebarHasFocus
			|| resizingLeftSidebar)

		if (shouldBeVisible !== lastLeftSidebarShouldBeVisible) {
			if (leftSidebarVisibilityTimeout) {
				clearTimeout(leftSidebarVisibilityTimeout)
			}

			if (shouldBeVisible) {
				leftSidebarVisible = true
				shouldDelayClosingSidebar = hoveringForLeftSidebar
					|| hoveringOverLeftSidebar
					|| resizingLeftSidebar
			}
			else {
				leftSidebarVisibilityTimeout = setTimeout(() => {
					leftSidebarVisible = false
				}, shouldDelayClosingSidebar ? 350 : 0)
			}

			lastLeftSidebarShouldBeVisible = shouldBeVisible
		}
	}
})

function onMainMouseMove(event: MouseEvent) {
	hoveringForLeftSidebar = event.clientX < $sidebarHoverHotspot
	hoveringForTopBar = hoveringForLeftSidebar || event.clientY < 36
}

function onDocumentMouseLeave(event: MouseEvent) {
	hoveringForLeftSidebar = false
	hoveringForTopBar = false
}

function onWindowKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented) return 
	if (event.key === 'Escape') {
		if (workspace.viewState.modal.depth > 0) {
			workspace.viewState.modal.pop()
			event.preventDefault()
			return
		}
		else if ($systemMenuIsOpen) {
			$systemMenuIsOpen = false
			event.preventDefault()
			return
		}
		else {
			const fl = workspace.viewState.tangent.focusLevel.value
			if (fl === FocusLevel.Thread) {
				workspace.commands.setMapFocusLevel.execute()
				event.preventDefault()
				return
			}
			else if (fl === FocusLevel.Map) {
				workspace.commands.setThreadFocusLevel.execute()
				event.preventDefault()
				return
			}
			else if (fl > FocusLevel.Thread) {
				workspace.commands.setThreadFocusLevel.execute()
				event.preventDefault()
				return
			}
		}
	}

	// Fallback to commands
	topCommandHandler(event)
}

function onWindowAuxClick(event: MouseEvent) {
	if (event.defaultPrevented) return

	if (event.button === 3) {
		event.preventDefault()
		workspace.commands.shiftHistoryBack.execute()
	}
	else if (event.button === 4) {
		workspace.commands.shiftHistoryForward.execute()
	}
}

function onContextMenu(event: ExtendedContextEvent) {
	if (!event.defaultPrevented && (event.top || event.middle || event.bottom)) {
		workspace.showContextMenu(extractRawTemplate(event))
	}
}

function openCreationRules(event: Event) {
	// Delay the opening of a new popup
	// Otherwise, the new pop up menu closes itself immediately
	// Strangely, `tick()` does not work here
	wait().then(() => {
		$systemMenuIsOpen = true
		workspace.viewState.system.section.set('Creation Rules')
	})
}

function onViewContextMenu(event: MouseEvent) {
	appendContextTemplate(event, [
		{
			label: 'Open Map View Documentation',
			click: () => {
				workspace.api.documentation.open('Map View')
			}
		},
		{
			label: 'Open Thread View Documentation',
			click: () => {
				workspace.api.documentation.open('Thread View')
			}
		},
		{
			label: 'Open Focus Mode Documentation',
			click: () => {
				workspace.api.documentation.open('Focus Modes')
			}
		}
	], 'bottom')
}

</script>

<svelte:window on:keydown={onWindowKeydown} on:auxclick={onWindowAuxClick} />
<svelte:document on:mouseleave={onDocumentMouseLeave} />
<svelte:body on:mousemove={onMainMouseMove} on:contextmenu={onContextMenu}/>

<WindowBar showBorder={true} visible={topBarShouldBeVisible}>
	<nav class="buttonBar" slot="left" use:countPopUps={topBarPopupCount}>

		{#if !isMac || process.env.NODE_ENV === 'development'}
			<PopUpButton
				buttonClass="subtle"
				placement="bottom-start"
				tooltip="Menus"
				template={prepareMainMenuForWindow(buildMainMenu(workspace))}>
				{#snippet button()}
					<svg style={`width: 24px; height: 24px;`}>
						<use href="tangent-icon-nocolor.svg#icon"/>
					</svg>	
				{/snippet}
			</PopUpButton>
			<div class="spacer"></div>
		{/if}

		<!-- svelte-ignore a11y_consider_explicit_label -->
		<button class="subtle"
			use:command={{
				command: workspace.commands.toggleLeftSidebar,
				getToolTip: () => $leftSidebarMode === SidebarMode.pinned ? 'Close the left sidebar' : 'Pin the left sidebar'
			}}
			
		><svg style={`width: 24px; height: 24px; --sidebarStroke: var(--${$leftSidebarMode !== SidebarMode.pinned ? 'iconStroke' : 'backgroundColor'})`}>
			<use href="sidebar.svg#sidebar-left-fill"
				style={`opacity: ${$leftSidebarMode !== SidebarMode.pinned ? 0 : 1}; transition: opacity .5s;`}/>
			<use href="sidebar.svg#sidebar-left-closed" />
		</svg></button>

		<div class="spacer"></div>

		<PopUpButton name="New Note"
			buttonClass="subtle"
			command={workspace.commands.createNewFile}
			placement="bottom-start"
			menuMode="low-profile"
			tooltip="Create New Note"
			closeMenuOnClick
		>
			{#snippet button()}<svg style={`width: 24px; height: 24px;`}>
				<use href="file.svg#document"/>
				<use href="file.svg#plus"/>
			</svg>{/snippet}
			{#snippet menu()}
				<div class="popUpButtonList newNotes">
					<h1>New Note</h1>
					<div class="buttonGroup vertical">
						{#each workspace.workspaceSettings.value.creationRules.value.filter(r => r.showInMenu.value) as rule}
							<button
								class="no-callout"
								use:command={{
									command: workspace.commands.createNewFile,
									context: { rule },
									tooltipShortcut: false,
								}}
							>
								<span class="creation-rule-name"><CreationRuleName {rule}/></span>
								{#if rule.shortcut.value}
									<span class="shortcut">{shortcutDisplayString(rule.shortcut.value)}</span>
								{/if}
							</button>
						{/each}

						<!-- svelte-ignore a11y_invalid_attribute -->
						<a href="#" class="local deemphasized manageRules" onclick={openCreationRules}>Manage Rules</a>
					</div>
				</div>
			{/snippet}
		</PopUpButton>

		<div class="spacer"></div>

		<span class="buttonGroup">
			<PopUpButton
				buttonClass="subtle"
				command={workspace.commands.shiftHistoryBack}
				menuMode="low-profile"
				placement="bottom-start"
				showPopUpIndicator={false}
				closeMenuOnClick
			>
				{#snippet button()}
					<SvgIcon ref="arrows.svg#back"></SvgIcon>
				{/snippet}
				{#snippet menu()}
					<ThreadHistoryListView
						session={workspace.viewState.tangent.activeSession.value}
						direction={-1}
					/>
				{/snippet}
			</PopUpButton>
			<PopUpButton
				buttonClass="subtle"
				command={workspace.commands.shiftHistoryForward}
				menuMode="low-profile"
				placement="bottom-start"
				showPopUpIndicator={false}
				closeMenuOnClick
			>
				{#snippet button()}
					<SvgIcon ref="arrows.svg#forward"></SvgIcon>
				{/snippet}
				{#snippet menu()}
					<ThreadHistoryListView
						session={workspace.viewState.tangent.activeSession.value}
						direction={1}
					/>
				{/snippet}
			</PopUpButton>
		</span>

		<div class="spacer"></div>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span class="buttonGroup"
			oncontextmenu={onViewContextMenu}
		>
			<button class="subtle"
				use:command={{
					command: workspace.commands.setMapFocusLevel,
					context: {
						toggle: false
					},
					labelAsTooltip: true
				}}
			><FocusLevelIcon focusLevel={FocusLevel.Map}/></button>

			<button class="subtle"
				use:command={{
					command: workspace.commands.setThreadFocusLevel,
					labelAsTooltip: true
				}}
			><FocusLevelIcon focusLevel={FocusLevel.Thread}/></button>

			<PopUpButton name='Focus'
				buttonClass="subtle"
				command={workspace.commands.toggleFocusMode}
				commandContext = {{ toggle: false }}
				placement={'bottom-start'}
				menuMode="low-profile"
				closeMenuOnClick
			>
				{#snippet button()}
					<FocusLevelIcon focusLevel={$targetFocusModeLevel}/>
				{/snippet}
				{#snippet menu()}
					<div class="popUpButtonList">
						<h1>Focus Mode</h1>
						<div class="buttonGroup vertical"> 
							{#each FocusLevel.focusModeFocusLevels as level}
								
								<button
									class="no-callout"
									use:command={{
										command: workspace.commands.setFocusLevel,
										context: { targetFocusLevel: level },
										tooltip: FocusLevel.describeFocusLevel(level),
									}}
								>
									<FocusLevelIcon focusLevel={level}/>
									<div>{FocusLevel.getShortName(level)}</div>
								</button>
							{/each}
						</div>
					</div>
				{/snippet}
			</PopUpButton>
		</span>
	</nav>
	<nav class="buttonBar" slot="right" use:countPopUps={topBarPopupCount}>

		<PopUpButton
			buttonClass="subtle"
			command={workspace.commands.goTo}
			placement={'bottom'}
			menuMode="low-profile"
			closeMenuOnClick
		>
			{#snippet button()}
				<SvgIcon ref={[
					"query.svg#query"
				]} />
			{/snippet}
			{#snippet menu()}
				<div class="popUpButtonList">
					<!-- svelte-ignore a11y_consider_explicit_label -->
					<button class="subtle"
						use:command={{
							command: workspace.commands.goTo
						}}
					>
						<SvgIcon ref={[
							"query.svg#query"
						]} />
						<div>Files</div>
					</button>
					<!-- svelte-ignore a11y_consider_explicit_label -->
					<button class="subtle"
						use:command={{
							command: workspace.commands.search
						}}
					>
						<SvgIcon ref={[
							"file.svg#document",
							"commandPalette.svg#magnifying-glass"
						]} />
						<div>Content</div>
					</button>
					<!-- svelte-ignore a11y_consider_explicit_label -->
					<button class="subtle"
						use:command={{
							command: workspace.commands.do
						}}
					>
						<SvgIcon ref={[
							"commandPalette.svg#command"
						]} />
						<div>Commands</div>
					</button>
					<!-- svelte-ignore a11y_consider_explicit_label -->
					<button class="subtle"
						use:command={{
							command: workspace.commands.openQueryPane
						}}
					>
						<SvgIcon ref={[
							"query.svg#query-small",
							"query.svg#plus"
						]} />
						<div>New Query</div>
					</button>
				</div>
			{/snippet}
		</PopUpButton>

		<div class="spacer"></div>

		<System bind:detailsOpen={$systemMenuIsOpen}></System>
	</nav>
</WindowBar>

<main class="WorkspaceView">
	<div
		class="content"
		class:resizing={resizingLeftSidebar}
		style={`left: ${$leftSidebarMode === SidebarMode.pinned ? leftSidebarSize : 0}px;`}
		>
		<TangentView tangent={workspace.viewState.tangent}/>
	</div>
</main>

<LeftSidebar
	visible={leftSidebarVisible}
	bind:width={leftSidebarSize}
	bind:hoveringOver={hoveringOverLeftSidebar}
	bind:hasFocus={leftSidebarHasFocus}
	bind:resizing={resizingLeftSidebar} />

<ModalStateView modalState={workspace.viewState.modal} />

<style lang="scss">
nav {
	margin: 4px 0;

	-webkit-app-region: no-drag;

	.spacer {
		-webkit-app-region: drag;
	}
}

main {
	position: absolute;
	inset: 0;
	overflow: hidden;
	background-color: var(--noteBackgroundColor);
}

.content {
	position: absolute;
	inset: 0;
	
	&:not(.resizing) {
		transition: left .3s, right .3s;
	}
}

@media (min-width: 640px) {
	main {
		max-width: none;
	}
}

.popUpButtonList {
	h1 {
		font-size: 1.1rem;
		font-weight: normal;
		margin: 0;
		padding: .2em .5em;
		border-bottom: 1px solid var(--borderColor);
	}

	button {
		display: flex;
		width: 100%;
		align-items: center;
		font-size: .9rem;

		div {
			margin: 0 1em;
		}
	}
}

.popUpButtonList.newNotes {
	button {
		padding-top: .1em;
		padding-bottom: .1em;

		display: flex;
	}

	.creation-rule-name {
		flex-grow: 1;
		text-align: left;
	}

	.shortcut {
		color: var(--deemphasizedTextColor);
		padding-inline-start: 1em;
	}

	.manageRules {
		font-size: 80%;
		text-align: center;
		padding: .5em;

		border-top: 1px solid var(--borderColor);
	}
}
</style>