<script lang="ts">
import { getContext } from 'svelte'

import { SidebarMode } from 'common/SidebarState'

import type { Workspace } from 'app/model'
import command from 'app/model/commands/CommandAction'
import { getSortModeDisplayName } from 'app/model/directoryView'
import { appendContextTemplate, ExtendedContextEvent } from 'app/model/contextmenu'
import { startDrag } from 'app/utils'
import PopUpButton from 'app/utils/PopUpButton.svelte'

import FileTree from './FileTree/FileTree.svelte'
import SortingOptions from './FileTree/SortingOptions.svelte'
import SortModeIcon from './smart-icons/SortModeIcon.svelte'
import SvgIcon from './smart-icons/SVGIcon.svelte'
import { tooltip } from 'app/utils/tooltips'

const workspace = getContext('workspace') as Workspace

const mode = workspace.viewState.leftSidebar.mode
const size = workspace.viewState.leftSidebar.size
const currentTab = workspace.viewState.leftSidebar.currentTab

const tabs = [
	{
		key: 'files',
		name: 'Files & Folders',
		icon: 'folder.svg#folder'
	},
	{
		key: 'tags',
		name: 'Tags',
		icon: 'tag.svg#tag'
	}
]

export let visible: boolean
export let hoveringOver: boolean
export let resizing: boolean = false
export let width = 100

let windowWidth = 100

$: width = Math.min($size, windowWidth - 40)

let sortMenuIsOpen = false
let directoryViewSort = workspace.viewState.directoryView.sortMode
let tagTreeViewSort = workspace.viewState.tagTreeView.sortMode

function updateHoveringLeftSidebar(hovering: boolean) {
	hoveringOver = hovering
}

function startLeftDrag(event: MouseEvent) {
	resizing = true
	startDrag({
		move(event) {
			$size = event.clientX
		},
		end() {
			resizing = false
		}
	})
}

function onSidebarContextMenu(event: MouseEvent) {
	const contextEvent = event as ExtendedContextEvent

	if (!contextEvent.top && $currentTab === 'files') {
		appendContextTemplate(event, [
			{
				command: workspace.commands.createNewFile,
				commandContext: {
					folder: workspace.directoryStore.files
				}
			},
			{
				command: workspace.commands.createNewFolder,
				commandContext: {
					parent: workspace.directoryStore.files
				}
			}
		], 'top')
	}

	appendContextTemplate(event, [
		{
			label: 'Open Sidebar Documentation',
			click: () => {
				workspace.api.documentation.open('The Sidebar')
			}
		}
	], 'bottom')
}

function onWorkspaceNameContextMenu(event: MouseEvent) {
	appendContextTemplate(event, [
		{
			command: workspace.commands.openInFileBrowser,
			commandContext: {
				target: workspace.directoryStore.files,
				labelName: 'Workspace'
			}
		}
	])
}
</script>

<svelte:window bind:innerWidth={windowWidth} />

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
	class="sidebar left"
	class:pinned={$mode === SidebarMode.pinned}
	class:visible={visible}
	class:resizing={resizing}
	on:mouseover={() => updateHoveringLeftSidebar(true)}
	on:mouseleave={() => updateHoveringLeftSidebar(false)}
	on:contextmenu={onSidebarContextMenu}
	style={ `width: ${width}px; transform: translateX(${visible ? 0 : -width - 10}px);` }
>
	<header>
		<div
			class="workspace-name"
			use:tooltip={workspace.directoryStore.files.path}
			on:contextmenu={onWorkspaceNameContextMenu}
		>
			{workspace.directoryStore.files.name}
		</div>
		<span class="spacer"></span>
		<div class="tabs buttonBar buttonGroup">
			{#each tabs as tab}
				<button
					class:active={tab.key === $currentTab}
					on:click={e => $currentTab = tab.key}
					use:tooltip={"Shows {tab.name}"}
				>
					<SvgIcon ref={tab.icon} />
					<span class="name">
						{tab.name}
					</span>
				</button>
			{/each}
		</div>
		<span class="spacer"></span>
		<div class="buttonBar">
			{#if $currentTab === 'files'}
				<PopUpButton
					buttonClass="subtle"
					placement="bottom-start"
					tooltip={`Sorting by ${getSortModeDisplayName($directoryViewSort, true)}`}
					bind:showMenu={sortMenuIsOpen}
				>
					<svelte:fragment slot="button">
						<SortModeIcon sortMode={$directoryViewSort}/>
					</svelte:fragment>
					<SortingOptions directoryView={workspace.viewState.directoryView}/>
				</PopUpButton>

				<span class="spacer"></span>

				<button
					use:command={{
						command: workspace.commands.createNewFolder
					}}
					class="subtle"
				>
					<svg style={`width: 24px; height: 24px;`}>
						<use href="folder.svg#folder"/>
						<use href="folder.svg#plus"/>
					</svg>
				</button>
			{:else if $currentTab === 'tags'}
				<PopUpButton
					buttonClass="subtle"
					placement="bottom-start"
					tooltip={`Sorting by ${getSortModeDisplayName($tagTreeViewSort, true)}`}
					bind:showMenu={sortMenuIsOpen}
				>
					<svelte:fragment slot="button">
						<SortModeIcon sortMode={$tagTreeViewSort}/>
					</svelte:fragment>
					<SortingOptions directoryView={workspace.viewState.tagTreeView}/>
				</PopUpButton>
			{/if}
		</div>
	</header>
	<div class="scroller custom-scrollbar">
		{#if $currentTab === 'files'}
			<FileTree directoryView={workspace.viewState.directoryView} />
		{:else if $currentTab === 'tags'}
			<FileTree directoryView={workspace.viewState.tagTreeView} />
		{/if}
	</div>
	<div class="sidebar-resizer"
		on:mousedown={startLeftDrag}
	></div>
</div>

<style lang="scss">
.sidebar {
	overflow: hidden;

	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	z-index: 9;

	padding-top: var(--topBarHeight);

	min-width: 150px;

	display: flex;
	flex-direction: column;
	opacity: 0;

	background-color: var(--backgroundColor);

	&:not(.resizing) {
		transition: transform .3s, box-shadow .3s, opacity .3s;
	}

	&:not(.pinned) {
		box-shadow: 0 0 10px rgba(0, 0, 0, .3);
	}

	&.visible {
		opacity: 1;
	}

	.sidebar-resizer {
		position: absolute;
		top: 0;
		bottom: 0;

		width: 1px;

		cursor: ew-resize;
		border-right: 1px solid var(--borderColor);
	}

	header {
		margin: .5em;
		margin-right: .25em;
	}

	.workspace-name {
		color: var(--deemphasizedTextColor);
		margin-bottom: .25em;
	}
}

.tabs {
	button {
		flex-grow: 0;
		transition: flex-grow .4s, background-color .4s;
		overflow: hidden;

		position: relative;

		.name {
			position: absolute;
			white-space: nowrap;

			font-weight: 300;
			left: 2.25rem;
		}

		&.active {
			flex-grow: 1;
		}
	}
}

.sidebar.left .sidebar-resizer {
	right: 0;
}

.scroller {
	overflow-y: auto;
}
</style>
