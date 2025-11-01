<script lang="ts">
import { setContext } from 'svelte'

import type Workspace from 'app/model/Workspace'
import { FocusLevel } from 'common/dataTypes/TangentInfo'
import { SidebarMode } from 'common/SidebarState'

import WindowBar from '../WindowBar.svelte'
import TangentView from './Tangent/TangentView.svelte'
import System from './System/System.svelte'

import command from 'app/model/commands/CommandAction'
import FocusLevelIcon from './smart-icons/FocusLevelIcon.svelte'
import { appendContextTemplate, buildMainMenu, ContextMenuConstructorOptions, ExtendedContextEvent, extractRawTemplate, prepareMainMenuForWindow } from 'app/model/menus'
import { isMac } from 'common/platform'
import CreationRuleName from './summaries/CreationRuleName.svelte'
import PopUpButton from 'app/utils/PopUpButton.svelte'
import ModalStateView from 'app/modal/ModalStateView.svelte'
import LeftSidebar from './LeftSidebar.svelte'
import SvgIcon from './smart-icons/SVGIcon.svelte'
import ThreadHistoryListView from './summaries/ThreadHistoryListView.svelte'
import { createCommandHandler } from 'app/model/commands/Command'

export let workspace:Workspace

setContext('workspace', workspace)

$: focusLevel = workspace.viewState.tangent.focusLevel
$: targetFocusModeLevel = workspace.viewState.targetFocusModeLevel
$: topCommandHandler = createCommandHandler(Object.values(workspace.commands).filter(c => !c.group))

// Top bar
let hoveringForTopBar = false
let topBarShouldBeVisible = false

let focusMenuIsOpen = false
let newNoteMenuIsOpen = false
let backMenuIsOpen = false
let forwardMenuIsOpen = false
let systemMenuIsOpen = workspace.viewState.system.showMenu
workspace.on('editing', () => {
	// This is cheeky, but it works!
	if ($focusLevel >= FocusLevel.File) {
		topBarShouldBeVisible = false
	}
})

$: {
	topBarShouldBeVisible = topBarShouldBeVisible
		|| $focusLevel <= FocusLevel.Thread
		|| hoveringForTopBar
		|| leftSidebarVisible
		|| focusMenuIsOpen
		|| newNoteMenuIsOpen
		|| backMenuIsOpen
		|| forwardMenuIsOpen
}

// Sidebar
let sidebarHoverHotspot = workspace.settings.sidebarHoverHotspot
let leftSidebarMode = workspace.viewState.leftSidebar.mode
let leftSidebarSize = 100

let leftSidebarVisible = $leftSidebarMode === SidebarMode.pinned
let lastLeftSidebarShouldBeVisible = leftSidebarVisible

let hoveringForLeftSidebar = false
let hoveringOverLeftSidebar = false

let resizingLeftSidebar = false
let sortMenuIsOpen = false

let leftSidebarVisibilityTimeout = null

$: {
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
			|| resizingLeftSidebar
			|| sortMenuIsOpen)

		if (shouldBeVisible !== lastLeftSidebarShouldBeVisible) {
			if (leftSidebarVisibilityTimeout) {
				clearTimeout(leftSidebarVisibilityTimeout)
			}

			if (shouldBeVisible) {
				leftSidebarVisible = true
			}
			else {
				leftSidebarVisibilityTimeout = setTimeout(() => {
					leftSidebarVisible = false
				}, 350)
			}

			lastLeftSidebarShouldBeVisible = shouldBeVisible
		}
	}

	topBarShouldBeVisible = topBarShouldBeVisible || $focusLevel <= FocusLevel.Thread || hoveringForTopBar || leftSidebarVisible || focusMenuIsOpen
}

function setLeftSidebarPinned(newPinned: boolean) {
	if ($leftSidebarMode === SidebarMode.pinned && !newPinned) {
		$leftSidebarMode = SidebarMode.closed
	}
	else if ($leftSidebarMode === SidebarMode.hoverable && newPinned) {
		$leftSidebarMode = SidebarMode.pinned
	}
	else {
		$leftSidebarMode = newPinned ? SidebarMode.pinned : SidebarMode.hoverable
	}
}

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
	event.preventDefault()
	// Otherwise, the pop up menu closes itself immediately
	event.stopPropagation()
	newNoteMenuIsOpen = false
	$systemMenuIsOpen = true
	workspace.viewState.system.section.set('Creation Rules')
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
<!-- svelte-ignore avoid-mouse-events-on-document -->
<svelte:document on:mouseleave={onDocumentMouseLeave} />
<svelte:body on:mousemove={onMainMouseMove} on:contextmenu={onContextMenu}/>

<WindowBar showBorder={true} visible={topBarShouldBeVisible}>
	<nav class="buttonBar" slot="left">

		{#if !isMac || process.env.NODE_ENV === 'development'}
			<PopUpButton
				buttonClass="subtle"
				placement="bottom-start"
				tooltip="Menus"
				template={prepareMainMenuForWindow(buildMainMenu(workspace))}>
				<svg slot="button" style={`width: 24px; height: 24px;`}>
					<use href="tangent-icon-nocolor.svg#icon"/>
				</svg>
			</PopUpButton>
			<div class="spacer"></div>
		{/if}

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
			bind:showMenu={newNoteMenuIsOpen}
			closeMenuOnClick
		>
			<svelte:fragment slot="button"><svg style={`width: 24px; height: 24px;`}>
				<use href="file.svg#document"/>
				<use href="file.svg#plus"/>
			</svg></svelte:fragment>
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
							<CreationRuleName {rule}/>
						</button>
					{/each}

					<!-- svelte-ignore a11y-invalid-attribute -->
					<a href="#" class="local deemphasized manageRules" on:click={openCreationRules}>Manage Rules</a>
				</div>
			</div>
		</PopUpButton>

		<div class="spacer"></div>

		<span class="buttonGroup">
			<PopUpButton
				buttonClass="subtle"
				command={workspace.commands.shiftHistoryBack}
				menuMode="low-profile"
				placement="bottom-start"
				hidePopUpIndicator
				closeMenuOnClick
				bind:showMenu={backMenuIsOpen}
			>
				<SvgIcon slot="button" ref="arrows.svg#back"></SvgIcon>	
				<ThreadHistoryListView
					session={workspace.viewState.tangent.activeSession.value}
					direction={-1}
				>
				</ThreadHistoryListView>
			</PopUpButton>
			<PopUpButton
				buttonClass="subtle"
				command={workspace.commands.shiftHistoryForward}
				menuMode="low-profile"
				placement="bottom-start"
				hidePopUpIndicator
				closeMenuOnClick
				bind:showMenu={forwardMenuIsOpen}
			>
				<SvgIcon slot="button" ref="arrows.svg#forward"></SvgIcon>	
				<ThreadHistoryListView
					session={workspace.viewState.tangent.activeSession.value}
					direction={1}
				>
				</ThreadHistoryListView>
			</PopUpButton>
		</span>

		<div class="spacer"></div>

		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<span class="buttonGroup"
			on:contextmenu={onViewContextMenu}
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
				bind:showMenu={focusMenuIsOpen}
				closeMenuOnClick
			>
				<svelte:fragment slot="button">
					<FocusLevelIcon focusLevel={$targetFocusModeLevel}/>
				</svelte:fragment>
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
			</PopUpButton>
		</span>
	</nav>
	<nav class="buttonBar" slot="right">
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
	}

	.manageRules {
		font-size: 80%;
		text-align: center;
		padding: .5em;

		border-top: 1px solid var(--borderColor);
	}
}
</style>