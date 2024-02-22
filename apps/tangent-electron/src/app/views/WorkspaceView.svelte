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
import { appendContextTemplate, ContextMenuConstructorOptions, ExtendedContextEvent, extractRawTemplate } from 'app/model/contextmenu';
import { isMac } from 'common/isMac'
import CreationRuleName from './summaries/CreationRuleName.svelte'
import PopUpButton from 'app/utils/PopUpButton.svelte'
import ModalStateView from 'app/modal/ModalStateView.svelte'
import LeftSidebar from './LeftSidebar.svelte'
import SvgIcon from './smart-icons/SVGIcon.svelte'
import ThreadHistoryListView from './summaries/ThreadHistoryListView.svelte'
import { PasteTextEvent } from 'app/events'
import { createCommandHandler } from 'app/model/commands/Command'

export let workspace:Workspace

setContext('workspace', workspace)

workspace.api.edit.onPastePlaintext(onPastePlaintext)

$: focusLevel = workspace.viewState.tangent.focusLevel
$: targetFocusModeLevel = workspace.viewState.targetFocusModeLevel
$: topCommandHandler = createCommandHandler(Object.values(workspace.commands).filter(c => c.isTopShortcutCommand))

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
let leftSidebarSize = workspace.viewState.leftSidebar.size

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
	if (!event.defaultPrevented && (event.top || event.bottom)) {
		workspace.showContextMenu(extractRawTemplate(event))
	}
}

function openCreationRules(event: Event) {
	event.preventDefault()
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

function onPastePlaintext(text: string) {
	const element = document.querySelector('.nodeContainer.current main.noteEditor article')
	if (element && element instanceof HTMLElement) {
		element.focus()
	}
	element.dispatchEvent(new PasteTextEvent('pastePlaintext', {
		bubbles: true,
		text
	}))
}

function buildMainMenu() {
	const cmds = workspace.commands

	const editClick = (command: string) => {
		return () => {
			const element = document.querySelector('.nodeContainer.current main.noteEditor article')
			if (element && element instanceof HTMLElement) {
				element.focus()
			}
			workspace.api.edit.nativeAction(command as any)
		}
	}

	const template: ContextMenuConstructorOptions[] = [
		{
			label: 'File',
			submenu: [
				{ command: cmds.createNewFile },
				{
					label: 'Create New Note From Rule',
					command: cmds.createNewNoteFromRule
				},
				{
					label: 'Save',
					command: cmds.saveCurrentFile
				},
				{
					label: 'Duplicate',
					command: cmds.duplicateNode
				},
				{ type: 'separator' },
				{ command: cmds.closeCurrentFile },
				{ command: cmds.closeOtherFiles },
				{ command: cmds.closeLeftFiles },
				{ command: cmds.closeRightFiles },
				{ type: 'separator' },
				{ command: cmds.openWorkspace }
			]
		},
		{
			label: 'Edit',
			submenu: [
				{
					label: 'Undo',
					click: editClick('undo'),
					accelerator: 'Mod+Z'
				},
				{
					label: 'Redo',
					click: editClick('redo'),
					accelerator: 'Mod+Y' // Windows
				},
				{ type: 'separator' },
				{
					label: 'Cut',
					click: editClick('cut'),
					accelerator: 'Mod+X'
				},
				{
					label: 'Copy',
					click: editClick('copy'),
					accelerator: 'Mod+C'
				},
				{
					label: 'Paste',
					click: editClick('paste'),
					accelerator: 'Mod+V'
				},
				{
					label: 'Paste Without Formatting',
					click: editClick('pastePlaintext'),
					accelerator: 'Mod+Shift+V'
				},
				{
					label: 'Select All',
					click: editClick('selectAll'),
					accelerator: 'Mod+A'
				},
				{ type: 'separator' },
				{
					label: 'Formatting',
					submenu: [
						{ command: cmds.toggleBold },
						{ command: cmds.toggleItalics },
						{ command: cmds.toggleHighlight },
						{ command: cmds.toggleInlineCode },
						{ type: 'separator' },
						{ command: cmds.setParagraph },
						{ command: cmds.setHeader1 },
						{ command: cmds.setHeader2 },
						{ command: cmds.setHeader3 },
						{ command: cmds.setHeader4 },
						{ command: cmds.setHeader5 },
						{ command: cmds.setHeader6 }
					]
				},
				{
					label: 'Links',
					submenu: [
						{ command: cmds.toggleWikiLink },
						{ command: cmds.toggleMDLink }
					]
				},
				{ type: 'separator' },
				{
					command: cmds.openPreferences,
					click: () => {
						// Delay opening so menus know not be a derp
						setTimeout(() => {
							cmds.openPreferences.execute()
						}, 100)
					}
				}
			]
		},
		{
			label: 'View',
			submenu: [
				{
					type: 'checkbox',
					command: cmds.setMapFocusLevel
				},
				{
					type: 'checkbox',
					command: cmds.setThreadFocusLevel
				},
				{
					label: 'Toggle Focus',
					type: 'checkbox',
					command: cmds.toggleFocusMode
				},
				{
					id: 'window_setFileFocusLevel',
					label: '    File',
					type: 'checkbox',
					command: cmds.setFileFocusLevel
				},
				{
					id: 'window_setTypewriterFocusLevel',
					label: '    Typewriter',
					type: 'checkbox',
					command: cmds.setTypewriterFocusLevel
				},
				{
					id: 'window_setParagraphFocusLevel',
					label: '    Paragraph',
					type: 'checkbox',
					command: cmds.setParagraphFocusLevel
				},
				{
					id: 'window_setSentenceFocusLevel',
					label: '    Sentence',
					type: 'checkbox',
					command: cmds.setSentenceFocusLevel
				},
				{ command: cmds.showIncomingLinks },
				{ type: 'separator' },
				{
					label: 'Show Left Sidebar',
					command: cmds.toggleLeftSidebar,
					type: 'checkbox'
				},
				{ type: 'separator' },
				{ command: cmds.zoomIn },
				{ command: cmds.zoomOut },
				{ command: cmds.resetZoom },
				{ type: 'separator' },
				{
					command: cmds.floatWindow,
					type: 'checkbox'
				}
			]
		},
		{
			label: 'Go',
			submenu: [
				{ command: cmds.shiftHistoryBack, label: 'Go Back' },
				{ command: cmds.shiftHistoryForward, label: 'Go Forward' },
				{ type: 'separator' },
				{ command: cmds.goTo },
				{ command: cmds.openQueryPane },
				{ command: cmds.openInFileBrowser },
				{ command: cmds.moveToLeftFile },
				{ command: cmds.moveToRightFile },
			]
		},
		{
			label: 'Do',
			submenu: [
				{ command: cmds.do}
			]
		},
		{
			label: 'Help',
			submenu: [
				{
					label: 'Open Documentation',
					click() {
						workspace.api.documentation.open('Getting Started')
					}
				},
				{ command: cmds.openChangelog },
				{ type: 'separator' },
				{
					label: 'Tangent\'s Website',
					click() {
						workspace.api.links.openExternal('http://tangentnotes.com')
					}
				},
				{
					label: 'Email Tangent\'s Team',
					click() {
						workspace.api.links.openExternal(`mailto:contact@tangentnotes.com?subject=Tangent v${workspace.version}`)
					}
				},
				{ type: 'separator' },
				{
					label: 'Tangent on Discord',
					click() {
						workspace.api.links.openExternal('https://discord.gg/6VpvhUnxFe')
					}
				},
				{
				label: 'Tangent on Mastodon',
					click() {
						workspace.api.links.openExternal('https://indieapps.space/@tangentnotes')
					}
				},
				{ type: 'separator' },
				{ command: cmds.openLogs }
			]
		}
	]
	return template
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
				template={buildMainMenu}>
				<svg slot="button" style={`width: 24px; height: 24px;`}>
					<use href="tangent-icon-nocolor.svg#icon"/>
				</svg>
			</PopUpButton>
			<div class="spacer"></div>
		{/if}

		<button class="subtle"
			on:click={() => setLeftSidebarPinned($leftSidebarMode !== SidebarMode.pinned)}
			title={$leftSidebarMode === SidebarMode.pinned ? 'Close the left sidebar' : 'Pin the left sidebar'}
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
			title="Create New Note"
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
								tooltipShortcut: false
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
				title="Enable Focus Mode"
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
							
							<button title={FocusLevel.describeFocusLevel(level)}
								class="no-callout"
								use:command={{
									command: workspace.commands.setFocusLevel,
									context: { targetFocusLevel: level }
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
		style={`left: ${$leftSidebarMode === SidebarMode.pinned ? $leftSidebarSize : 0}px;`}
		>
		<TangentView tangent={workspace.viewState.tangent}/>
	</div>
</main>

<LeftSidebar
	visible={leftSidebarVisible}
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