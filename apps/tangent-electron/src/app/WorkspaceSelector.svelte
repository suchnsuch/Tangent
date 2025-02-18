<script lang="ts">
import { createEventDispatcher } from 'svelte'
import type WindowAPI from 'common/WindowApi'
import paths from 'common/paths'

import WindowBar from './WindowBar.svelte'
import PopUpButton from './utils/PopUpButton.svelte'
import SvgIcon from './views/smart-icons/SVGIcon.svelte'

export let api: WindowAPI

let dispatch = createEventDispatcher()

let workspacesPromise: Promise<string[]> = api.getKnownWorkspaces()

function refreshWorkspaceList() {
	workspacesPromise = api.getKnownWorkspaces()
}

async function openNewWorkspace() {
	let dialogResult = await api.getWorkspaceDialog()

	openWorkspace(dialogResult)
}

function openWorkspace(workspacePath: string) {
	if (workspacePath) {
		dispatch('workspaceSelected', workspacePath)
	}
}

function forgetWorkspace(workspacePath: string) {
	if (workspacePath) {
		api.forgetWorkspace(workspacePath)

		refreshWorkspaceList()
	}
}

function openDocumentation() {
	api.documentation.open('Getting Started')
}
</script>

<WindowBar></WindowBar>
<main>
	{#await workspacesPromise}
		<div class="empty">
			<SvgIcon
				ref="tangent-icon-nocolor.svg#icon"
				size="256"
				styleString="--iconStroke: var(--embossedBackgroundColor);"
				/>
			<h1 class="loading">Loading Workspaces…</h1>
		</div>
	{:then workspaces}
		{#if workspaces.length}
			<h1>Welcome Back</h1>
			<h2>Known Workspaces</h2>
			<ul>
				{#each workspaces as workspace}
					<li class="buttonGroup">
						<button on:click={() => openWorkspace(workspace)}>
							<h3>{paths.basename(workspace)}</h3>
							<p>{workspace}</p>
						</button>
						<PopUpButton name="…" placement="right" menuMode="low-profile">
							<div class="workspaceMenu buttonGroup vertical">
								<button
									title="Reveal this workspace in the file browser."
									on:click={() => api.showInFileBrowser(workspace)}
									>Show Workspace</button>
								<button
									title="Remove this workspace from this list"
									on:click={() => forgetWorkspace(workspace)}
								>Forget Workspace</button>
							</div>
						</PopUpButton>
					</li>
				{/each}
			</ul>
		{:else}
			<h1>Welcome To Tangent</h1>
			<p>
				<em>Tangent</em> is designed to work on many files within a folder.
				This folder is called a "workspace."
				Think of a workspace as a big bucket of all of your thoughts.
			</p>
			<p>
				You can have few or many workspaces, but you need at least one!
				For more information, check out
				<!-- svelte-ignore a11y-invalid-attribute -->
				<a href="#" on:click={openDocumentation} class="local">the documentation</a>.
			</p>
		{/if}

		<div class="newButton">
			<button on:click={openNewWorkspace}>Open New Workspace</button>
		</div>
	
		{#if workspaces.length}
			<p class="documentation">	
				<!-- svelte-ignore a11y-invalid-attribute -->
				<a href="#" on:click={openDocumentation} class="local">Open Documentation</a>
			</p>
		{/if}
	{/await}
</main>

<style lang="scss">
main {
	padding-top: var(--topBarHeight);
	max-width: 35rem;
	margin: 2rem auto;
}

h1 {
	font-weight: 300;
}

h2 {
	font-weight: 400;
}

.loading {
	text-align: center;
	color: var(--deemphasizedTextColor);
}

p {
	line-height: 1.5rem;
}

.newButton {
	text-align: center;
}

ul {
	list-style: none;
	text-align: left;
}

li {
	display: flex;
	box-shadow: 0 0 3px rgba(0, 0, 0, .3);
	margin: .5em 0;
}

li > :global(button) {
	display: block;
	text-align: left;

	padding: .5rem;

	&:first-child {
		flex-grow: 1;
	}

	&:last-child {
		flex-grow: 0;
		flex-shrink: 1;

		:global(.buttonContent) {
			font-size: 200%;
			position: relative;
			top: -.25em;
		}
	}
}

button h3, button p {
	margin: 0;
}

button p {
	color: var(--deemphasizedTextColor);
}

.empty {
	margin-top: 25vh;
	color: var(--deemphasizedTextColor);
	font-style: italic;
	text-align: center;
	flex-grow: 1;

	font-size: 80%;
}

.documentation {
	text-align: center;
	margin-top: 1em;
}
</style>