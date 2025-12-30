<script lang="ts">
import type { PageData } from './$types'
import DownloadList from './DownloadList.svelte'
import { channels } from '../types'
import type { BuildSet, Build, SKU } from '../types'
import { onMount } from 'svelte'

type BuildResult = {
	builds?: BuildSet
	highlightChoice?: SKU
	altChoices?: SKU[]
}

export let data: PageData

async function getBuilds(): Promise<BuildResult> {
	console.log('Fetching…')
	const res = await fetch('/versions/latest')
	if (!res.ok) {
		throw new Error('Could not fetch builds')
	}

	const builds = await res.json() as BuildSet

	const latest = builds.latest
	if (!latest) {
		throw new Error('No latest build!')
	}

	// Remove duplicate alpha/beta builds
	const version = latest.version
	const dupeList = ['alpha', 'beta'] as const
	for (const key of dupeList) {
		if (builds[key]?.version === version) {
			delete builds[key]
		}
	}

	return {
		builds,
		highlightChoice: latest.skus[data.highlightChoice],
		altChoices: data.altChoices.map(c => latest.skus[c]),
	}
}

let buildFetchProcess: Promise<BuildResult> = new Promise(() => {})

onMount(() => {
	buildFetchProcess = getBuilds()
})

function releaseDate(dateString: string) {
	let date = new Date(dateString)
	return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function osNameShim(osName: string) {
	let match = osName.match(/\(.*\)/)
	if (match) {
		let split = osName.split(match[0])
		return split[0] + '<span class="osSub">' + match[0] + '</span>' + split[1]
	}
	return osName;
}

</script>

<article>
	<h1>Join the Open Alpha</h1>
	<p>
		Tangent is being developed out in the open on <a href="https://github.com/suchnsuch/Tangent" target="_blank">Github</a>.
		The app is open source and will always be free!
		Come in and join the fun!
	</p>
	{#await buildFetchProcess}
		<p class="checking-latest">Checking latest build…</p>
	{:then result}
		{@const { builds, highlightChoice, altChoices } = result}
		{#if highlightChoice}
			<p class="main-link">
				<a class={highlightChoice.os} href={highlightChoice.path}>
					<span class="icon"></span>
					<span class="version">
						Download
						v{highlightChoice.version}
						for {highlightChoice.displayName}
					</span>
					<span class="date">Released {releaseDate(highlightChoice.releaseDate)}</span>
				</a>
			</p>

			{#if altChoices.length}
				<p class="links">
					Or, download for:
					{#each altChoices as choice}
						{#if choice} <!--TODO: Remove once portables are standard-->
						<a href={choice.path}>{@html osNameShim(choice.displayName)}</a>
						{/if}
					{/each}
				</p>
			{/if}
		{/if}

		<p>
			Tangent is also available
			<a target="_blank" rel="noopener" href="https://flathub.org/apps/io.github.suchnsuch.Tangent">on Flathub</a>.
		</p>
			
		<p>
			If you encounter bugs, or if you think of a feature that you wish Tangent had, reach out in your favorite way:
		</p>

		<ul>
			<li>Open an issue on <a href="https://github.com/suchnsuch/Tangent/issues" target="_blank">Github</a>.</li>
			<li>Post to the community on <a href="https://discord.gg/6VpvhUnxFe" target="_blank">Discord</a>.</li>
			<li>Toot at the project on <a href="https://mastodon.social/@tangentnotes" target="_blank">Mastodon</a>.</li>
		</ul>

		<p>Any which way, we'll do our best to help you out.</p>
	
		{#if builds.beta || builds.alpha}
			<h1>Development Builds</h1>
		{/if}
		{#if builds.beta}
			<h2>Beta – Release Preview</h2>
			<DownloadList build={builds.beta}/>
			<p>
				Beta builds are preview releases for upcoming stable versions.
				They are intended to be stable, but may still contain bugs.
			</p>
		{/if}
		{#if builds.alpha}
			<h2>Alpha – The Bleeding Edge</h2>
			<DownloadList build={builds.alpha}/>
			<p>
				Alpha builds let you get access to the
				<a href="/Roadmap">upcoming features</a>
				as quickly as possible.
				These versions will have the most instability and bugs;
				however, feedback on these versions will have the most impact!
			</p>
		{/if}

		{#if builds.legacy}
			<h1>Tangent Legacy</h1>
			<p>
				For those of you remaining on MacOS Catalina (10.15.x), Tangent Legacy looks to offer as close to the same experience as the mainline Tangent builds,
				but running on a compatible Electron version
				<a target="_blank" href="https://www.electronjs.org/blog/electron-33-0#removed-macos-1015-support">(32.x)</a>:
			</p>
			<DownloadList build={builds.legacy}/>
			<p>
				This legacy version of Tangent will follow the stable releases at a reasonable cadance and won't auto-upgrade into an incompatible version.
			</p>
		{/if}
	{:catch}
		<p class="fetch-error">Something went wrong. Builds could not be fetched. Please reload the page to try again.</p>
	{/await}
</article>

<style lang="scss">
.main-link {
	text-align: center;

	a {
		display: inline-grid;
		justify-content: center;
		align-items: center;
		background-color: var(--accentBackgroundColor);
		color: var(--textColor);
		padding: .75em 1.5em;
		border-radius: .75em;

		grid-template-columns: auto auto;
		grid-template-rows: auto auto;
		grid-template-areas: "icon version"
							"icon date";

		&:hover {
			background-color: var(--accentHoverBackgroundColor);
			text-decoration: none;
		}
		&:active {
			background-color: var(--accentActiveBackgroundColor);
		}

		.icon {
			grid-area: icon;
			display: inline-block;
			width: 24px;
			height: 24px;
			background-size: 24px 24px;
			background-repeat: no-repeat;
			margin-right: 2em;
		}

		.version {
			grid-area: version;
		}
		
		.date {
			font-size: 70%;
			grid-area: date;
			font-style: italic;
		}

		&.mac .icon {
			background-image: url("/mac_logo.svg");
		}

		&.win .icon {
			background-image: url("/windows_logo.svg");
		}
	}
}

ul {
	padding-left: 3em;
	margin-top: .25em;
}

.links {
	text-align: left;
	font-style: italic;
	color: var(--deemphasizedTextColor);

	width: 225px;
	margin: 0 auto;

	a {
		margin-left: 2em;
		display: block;
		font-style: normal;
		white-space: nowrap;

		:global(.osSub) {
			position: relative;
			font-size: 70%;
			bottom: .125em;
		}
	}
}

.checking-latest {
	margin-top: 5em;
	text-align: center;
	font-style: italic;
	color: var(--deemphasizedTextColor);
}
</style>
