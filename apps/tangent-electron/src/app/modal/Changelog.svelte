<script lang="ts">
import { firstOrNull, includesAny, singleOrEmpty } from '@such-n-such/core'
import MarkdownView from 'app/views/editors/NoteEditor/MarkdownViewComponent.svelte'
import SettingView from 'app/views/System/SettingView.svelte'
import { getContext } from 'svelte'
import { compareBuild } from 'semver'
import type Workspace from '../model/Workspace'
import type { NavigationData } from 'app/events';

const workspace = getContext('workspace') as Workspace

const {
	showChangelogOnUpdate,
	updateChannel
} = workspace.settings

export let selectedVersions: string[] = []

let allVersions: string[] = []
let recentVersions: string[] = []

let visibleRecentVersions: string[] = []
let visibleOldVersions: string[] = []

$: filterVersions(allVersions, $updateChannel, recentVersions)
function filterVersions(versions, updateChannel, recentVersions) {
	const showAlphas = updateChannel === 'alpha'
	const showBetas = updateChannel === 'alpha' || updateChannel === 'beta'

	const versionFilter = v => {
		if (v.includes('alpha') && !showAlphas) {
			return false
		}
		if (v.includes('beta') && !showBetas) {
			return false
		}

		return true
	}

	visibleRecentVersions = recentVersions.filter(versionFilter)
	visibleOldVersions = allVersions.filter(v => {
		return versionFilter(v) && !visibleRecentVersions.includes(v)
	})
	
	if (!includesAny(visibleOldVersions, selectedVersions) && !includesAny(visibleRecentVersions, selectedVersions)) {
		selectedVersions = singleOrEmpty(firstOrNull(visibleRecentVersions) ?? firstOrNull(visibleOldVersions))
	}
}

workspace.api.documentation.getChangelogs().then(async versions => {
	recentVersions = await workspace.api.documentation.getRecentChanges()

	selectedVersions = recentVersions.length ? recentVersions.slice() : singleOrEmpty(versions[0])

	allVersions = versions
})

$: versionDetailsPromise = Promise.all(selectedVersions.map(v => 
	workspace.api.documentation.get(v)
))

function versionClicked(event: MouseEvent, version: string) {
	if (event.shiftKey) {
		if (!selectedVersions.includes(version)) {
			selectedVersions.push(version)
			selectedVersions.sort((a, b) => -compareBuild(a, b))
			selectedVersions = selectedVersions // Reactivity hack
		}
	}
	else {
		selectedVersions = [version]
	}
}

function onNavigate(event: CustomEvent<NavigationData>) {
	const { link } = event.detail
	if (link.form == 'wiki') {
		workspace.api.documentation.open(link.href)
	}
}

</script>

<main>
	<nav>
		{#if visibleRecentVersions.length > 0}
			<h1>Recent Changes</h1>
			{#each visibleRecentVersions as version}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div
					class:selected={selectedVersions.includes(version)}
					on:click={e => versionClicked(e, version)}
				>{version}</div>
			{/each}
		{/if}
		<h1>Previous Changes</h1>
		{#each visibleOldVersions as version}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div
				class:selected={selectedVersions.includes(version)}
				on:click={e => versionClicked(e, version)}
			>{version}</div>
		{/each}
	</nav>
	<div class="details">
		{#if versionDetailsPromise}
			{#await versionDetailsPromise then versionDetailsList}
				<h1>Update Notes</h1>
				{#each versionDetailsList as versionDetails, i}
					<h2>{versionDetails.title}</h2>
					<MarkdownView content={versionDetails.content} on:navigate={onNavigate}></MarkdownView>
				{/each}
			{/await}
		{/if}
	</div>
	<div class="settings">
		<SettingView setting={showChangelogOnUpdate} />
		<div class="spacer"></div>
		<button on:click={e => workspace.viewState.modal.close()}>Close</button>
	</div>
</main>

<style lang="scss">
main {
	background: var(--backgroundColor);
	padding: .5em;

	border-bottom-left-radius: var(--borderRadius);
	border-bottom-right-radius: var(--borderRadius);

	display: grid;
	grid-template-rows: 1fr auto;
	grid-template-areas: 
		"nav details"
		"settings settings";
	gap: .5em;

	max-height: 90vh;
	overflow: hidden;
}

h1, h2 {
	text-align: center;
	font-weight: 500;
}

h1 {
	font-size: x-large;
}
h2 {
	font-size: large;
}

nav {
	overflow-y: auto;
	grid-area: nav;

	h1 {
		margin: .5em;
		font-size: large;
		font-weight: 500;
		&:not(:first-child) {
			margin-top: 1em;
		}
	}

	div {
		padding: .3em .75em;
		cursor: pointer;
		&.selected {
			font-weight: 500;
			background: var(--accentBackgroundColor);
		}
	}
}

.details {
	grid-area: details;
	overflow-y: auto;
	width: 600px;
	background: var(--noteBackgroundColor);

	:global {
		/* TODO: remove this once links can resolve to documentation properly */
		t-link[link-state="empty"] {
			color: var(--accentTextColor) !important;
		}
	}
}

.settings {
	grid-area: settings;

	display: flex;
	align-items: center;

	:global {
		.SettingView {
			color: var(--deemphasizedTextColor);
		}
	}
}
</style>
