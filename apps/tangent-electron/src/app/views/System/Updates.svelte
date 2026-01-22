<script lang="ts">
import { getContext } from 'svelte'
import { slide } from 'svelte/transition'

import * as dates from 'common/dates'

import type Workspace from 'app/model/Workspace'
import SettingView from './SettingView.svelte'

let workspace = getContext('workspace') as Workspace
let state = workspace.updateState

let suppressUpdates = false

$: channel = workspace.settings.updateChannel

$: mode = state.mode
$: lastChecked = state.lastChecked
$: nextUpdate = state.nextUpdate
$: downloadProgress = state.downloadProgress
$: errorMessage = state.errorMessage

$: buttonText = getButtonText($mode, $nextUpdate)
function getButtonText(_m?, _n?) {
	const version = $nextUpdate?.version || ''
	switch ($mode) {
		case 'idle':
		case 'up-to-date':
		case 'error':
			return 'Check for Updates'
		case 'checking':
			return 'Checking…'
		case 'available':
			return `Download ${version}`
		case 'downloading':
			return `Downloading ${version}`
		case 'ready':
			return `Quit and Update to ${version}`
	}
}

$: downloadPercent = $downloadProgress?.percent || 0

function buttonClicked() {
	switch ($mode) {
		case 'idle':
		case 'up-to-date':
		case 'error':
			return state.checkForUpdate()
		case 'ready':
			return state.updateNow()
	}
}

function laterButtonClick() {
	suppressUpdates = true
}

</script>

<main>
	<p>
		<SettingView setting={channel} showReset={false} />
	</p>
	{#if $channel === 'beta'}
		<p class="message">
			The beta channel may contain bugs.
			If you encounter a bug, please
			<a target="_blank" rel="noreferrer" href="https://mastodon.social/@taylorhadden">tell me on Mastodon</a>.
		</p>
	{:else if $channel === 'alpha'}
		<p class="message warning">
			This channel <em>will</em> contain bugs.
			Only select this channel if you are comfortable with risking stability.
			If you encounter a bug, please
			<a target="_blank" rel="noreferrer" href="https://mastodon.social/@taylorhadden">tell me on Mastodon</a>.
		</p>
	{/if}

	<article>
		<button
			class="updateButton"
			on:click={buttonClicked}
			disabled={$mode === 'checking' || $mode === 'downloading'}
		>
			<div>{buttonText}</div>
			{#if downloadPercent}
				<div class="progressBar show" transition:slide={{ duration: 300 }}>
					<div class="progress" style={`width: ${downloadPercent}%;`}></div>
				</div>
			{/if}
		</button>

		{#if $mode === 'up-to-date'}
			<p class="info up-to-date" transition:slide={{ duration: 300 }}>
				You are up to date!
			</p>
		{/if}

		{#if $mode === 'ready'}
			<p class="info ready" transition:slide={{ duration: 300 }}>
				The update to {$nextUpdate.version} is ready!
				The update will be applied automatically on exit, or you can update now.
			</p>
			{#if suppressUpdates}
				<p class="info">
					Update notifications are suppressed until next exit.
				</p>
			{:else}
				<p class="laterButton">
					<button on:click={laterButtonClick}>Update Later</button>
				</p>
			{/if}
		{/if}
		{#if $mode === 'error'}
			<div class="info" transition:slide={{ duration: 300 }}>
				<p>
					The update {#if $nextUpdate}to {$nextUpdate.version}{/if} failed!
				</p>
				<p class="error">
					Error: "{$errorMessage}"
				</p>
				<p>
					You can try to check for updates again, or
					<a href="http://tangentnotes.com/Download" target="_blank" rel="noreferrer">download the latest installer.</a>
				</p>
			</div>
			
		{/if}

		<p class="lastChecked" class:show={$lastChecked != null}>
			Currently on v{workspace.version}.
			{#if $lastChecked != null}
				Last checked: {dates.shortestDayDate($lastChecked)}, {dates.clockTime($lastChecked)}
			{/if}
		</p>
		<p class="space"></p>
		<SettingView setting={workspace.settings.automaticallyCheckForUpdates}/>
	</article>
</main>

<style lang="scss">
.message {
	font-size: 80%;
	margin: 1em 2em;
	line-height: 1.25em;
}

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

.warning {
	color: var(--warningTextColor);
}

article {
	width: 350px;
	margin: 0 auto;
}

p {
	&:first-child {
		margin-top: 0
	}
	&:last-child {
		margin-bottom: 0;
	}
}

.updateButton {
	width: 100%;

	.progressBar {
		margin-top: 8px;
	}
}

.laterButton {
	font-size: 80%;
	text-align: center;
}

.lastChecked {
	font-size: 70%;
}

.up-to-date {
	text-align: center;
}

.info {
	font-size: 80%;
}

.error {
	color: red;
}

.space {
	margin-bottom: 3em;
}
</style>

