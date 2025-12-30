<script lang="ts">
import type { Build } from '../types'
import { oss } from '../types'
export let build: Build

function getSkus(build: Build) {
	return oss.map(os => build.skus[os]).filter(i => i != undefined)
}

function releaseDate(dateString: string) {
	let date = new Date(dateString)
	return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}
</script>

{#if build}
{@const skus = getSkus(build)}

{#if skus.length === 1}
	{@const sku = skus[0]}
	<p class="download">
		Download
		<a href={sku.path}>
			<span class="version accentText">v{build.version}</span>
			for
			{sku.displayName}
			<span class="date">(Updated {releaseDate(build.releaseDate)})</span>
		</a>
	</p>
{:else}
	<p class="download">
		Download
		<span class="version accentText">v{build.version}</span>
		<span class="date">(Updated {releaseDate(build.releaseDate)})</span>
		for:
	</p>
	<ul>
		{#each getSkus(build) as sku}
			<li>
				<a href={sku.path}>{sku.displayName}</a>
			</li>
		{/each}
	</ul>
{/if}

{/if}

<style>
.download {
	margin-bottom: 0;
}
.version {
	font-weight: 700;
}
.date {
	font-style: italic;
	font-size: 90%;
}
ul {
	margin-top: 0;
}
li {
	margin-left: 4em;
}
</style>