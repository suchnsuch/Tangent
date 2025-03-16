<script lang="ts">
import type { Workspace } from 'app/model'
import { getContext } from 'svelte'
import { tooltip } from './tooltips'

const workspace: Workspace = getContext('workspace')
export let pageName
export let style = ''

function click() {
	workspace.api.documentation.open(pageName)
}

function title() {
	return `Documentation for ${pageName}`
}
</script>

<button class="doc-link" on:click={click} {style} use:tooltip={title()}></button>

<style lang="scss">
button {
	width: 1.5em;
	height: 1.5em;
	border-radius: 1em;
	font-size: 90%;

	display: inline-flex;
	align-items: center;
	justify-content: center;

	&:after {
		content: "?"
	}
}
</style>
