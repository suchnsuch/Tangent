<script lang="ts">
import { getContext, untrack } from 'svelte';
import { isMac } from 'common/platform'
import type Workspace from 'app/model/Workspace'
import type { UpdateMode } from 'app/model/UpdateState'
import PopUpButton from 'app/utils/PopUpButton.svelte'
import DocumentationLink from 'app/utils/DocumentationLink.svelte'

import Appearance from './Appearance.svelte'
import Attachments from './Attachments.svelte'
import CreationRules from './CreationRules.svelte'
import Database from './Database.svelte'
import Updates from './Updates.svelte'
import About from './About.svelte'
import Maps from './Maps.svelte'
import Notes from './Notes.svelte'
import Styles from './Styles.svelte'
import Dictionary from './Dictionary.svelte'
import Shortcuts from './Shortcuts.svelte'
import Debug from './Debug.svelte'

let {
	detailsOpen = $bindable(false)
} = $props()

const workspace = getContext('workspace') as Workspace
const section = workspace.viewState.system.section

// Update Data
const updateState = workspace.updateState
let suppressUpdates = false
let mode = $derived(updateState.mode)
let downloadProgress = $derived(updateState.downloadProgress)

$effect(() => {
	let _mode = $mode
	untrack(() => {
		if (_mode === 'ready' && !suppressUpdates && !detailsOpen && workspace.viewState.modal.stack.length == 0) {
			detailsOpen = true
			section.set('Updates')
		}	
	}) 
})

let downloadPercent = $derived($downloadProgress?.percent || 0)

// Sub-menus
const menus = [
	{
		name: 'Appearance',
		component: Appearance
	},
	{
		name: 'Attachments',
		component: Attachments
	},
	{
		name: 'Creation Rules',
		component: CreationRules
	},
	{
		name: 'Database',
		component: Database
	},
	{
		name: 'Maps',
		component: Maps
	},
	{
		name: 'Notes',
		component: Notes
	},
	{
		name: 'Shortcuts',
		component: Shortcuts
	},
	{
		name: 'Custom Styles',
		component: Styles
	},
	{
		name: 'Dictionary',
		component: Dictionary
	},
	{
		name: 'Updates',
		component: Updates
	},
	{
		name: 'About',
		component: About,
		documentation: false
	}
]

if (workspace.isPreviewBuild() || workspace.settings.updateChannel.value !== 'latest') {
	menus.push({
		name: 'Debug',
		component: Debug
	})
}

let currentMenu = $derived(menus.find(m => m.name === $section) ?? menus[0])
</script>

<PopUpButton buttonClass="subtle"
	bind:showMenu={detailsOpen}
	menuMode="low-profile"
	tooltip={{
		tooltip: "Open settings",
		shortcut: isMac ? '⌘ ,' : 'Ctrl+,'
	}}
>
	{#snippet button()}
		<div class={'buttonContent ' + $mode} class:supressed={suppressUpdates}>
			<svg style={`width: 24px; height: 24px;`}>
				{#if $mode === 'ready'}
					<use href="update.svg#arrow" />
				{:else}
				<use href="system.svg#gear" />
				{/if}
			</svg>
			<div class="progressBar" class:show={downloadPercent}>
				<div class="progress" style={`width: ${downloadPercent}%;`}></div>
			</div>
		</div>
	{/snippet}
	{#snippet menu()}
		<main class="SystemMenu">
			<nav>
				{#each menus as menu}
					<button
						onclick={() => $section = menu.name}
						class:current={menu === currentMenu}>
						{menu.name}
					</button>
				{/each}
			</nav>
			<article class="systemMenu">
				<h1>{currentMenu.name}</h1>
				{#if currentMenu.documentation !== false}
					<DocumentationLink
						pageName={currentMenu.documentation ?? currentMenu.name}
						pagePath={'Configuration/' + (currentMenu.documentation ?? currentMenu.name)}
						style="position: absolute;
							top: .5em;
							right: 10px;"
					/>
				{/if}
				<currentMenu.component />
			</article>
		</main>
	{/snippet}
</PopUpButton>

<style lang="scss">
.progressBar {
	visibility: hidden;
	height: 4px;

	&.show {
		visibility: visible;
	}

	.progress {
		height: 100%;
		background-color: var(--accentTextColor);

		transition: width .1s;
	}
}

.buttonContent {
	display: flex;
	align-items: center;
	position: relative;
	&.ready {
		--updateFill: var(--accentTextColor);
		--iconStroke: var(--accentTextColor);
	}
	&.supressed {
		--updateFill: none;
	}
	&.error {
		--updateFill: red;
		--iconStroke: red;
	}

	.progressBar {
		position: absolute;
		bottom: 1px;
		width: 100%;
		height: 3px;
	}
}

main {
	display: flex;
	background-color: var(--backgroundColor);

	max-height: calc(100vh - var(--topBarHeight) - 8px);
}

nav {
	background: var(--noteBackgroundColor);
	padding: 4px 0px 4px 4px;

	overflow: auto;
	border: 4px solid var(--backgroundColor);
	border-right: 0px solid transparent;

	button {
		display: block;
		width: 100%;
		font-size: 110%;
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;

		background-color: transparent;
		text-align: right;

		&.current, &:active {
			background-color: var(--accentActiveBackgroundColor);
		}
	}
}

article {
	padding: 4px 4px 8px 8px;

	border-left: 4px solid var(--accentActiveBackgroundColor);
	border-top-left-radius: 2px;
	border-bottom-left-radius: 2px;

	display: flex;
	flex-direction: column;
	font-size: 90%;

	width: 500px;
	overflow: auto;
}

h1 {
	margin-top: 0;
	text-align: center;
	font-weight: 500;
}

:global {
	.systemMenu {
		h2 {
			margin: .25em;
			font-weight: 500;
		}

		.info {
			color: var(--deemphasizedTextColor);
			padding: 1em 3em;
			margin: 0;
		}

		.settingsGroup {
			margin-bottom: 1.5em;
			border-spacing: .25em .5em;

			display: grid;
			grid-template-columns: max-content auto;
			row-gap: .5em;
			column-gap: .25em;
			grid-auto-rows: auto;
			align-items: center;

			.SettingView {
				display: contents;

				h2 {
					grid-column: 1;
					text-align: right;
				}
				.value {
					grid-column: 2;
				}
			}

			> p {
				margin-bottom: 0;
			}

			.value-details {
				grid-column: 2;
			}

			.explanation {
				color: var(--deemphasizedTextColor);
				font-size: 90%;
			}
		}
	}
}

</style>
