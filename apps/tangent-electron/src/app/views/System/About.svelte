<script lang="ts">
import type { Workspace } from 'app/model'
import { getContext } from 'svelte'

const workspace: Workspace = getContext('workspace')

function openDocumentation() {
	workspace.api.documentation.open('Getting Started')
}
</script>

<main>
	<p class="logo">
		
	</p>
	<p class="version">v{workspace.version}</p>
	<p>
		<span class="tangent">Tangent</span> is made by 
		<a target="_blank" rel="noreferrer" href="http://tangentnotes.com/About">Taylor Hadden</a>.
		It is designed to help you follow your interest as you write.
		Never get lost, never lose your train of thought.
	</p>
	<p>
		
	</p>
	<p>
		<!-- svelte-ignore a11y-invalid-attribute -->
		Take a look at <a href="#" on:click={openDocumentation} class="local">the documentation</a> if you have a question.
		If that doesn't fill your needs, please reach out on
		<a target="_blank" rel="noreferrer" href="https://discord.gg/6VpvhUnxFe">Discord</a>,
		<a target="_blank" rel="noreferrer" href="https://indieapps.space/@tangentnotes">Mastodon</a>, or through
		<a target="_blank" rel="noreferrer" href={`mailto: contact@tangentnotes.com?Subject=Tangent v${workspace.version}`}>email</a>.
	</p>
	<p>
		Tangent is currently in an early development state.
		If you encounter a bug, have a question, or think of a feature you would love to have, please
		<a target="_blank" rel="noreferrer" href="https://github.com/suchnsuch/tangent-public/issues/new">open an issue on GitHub</a>
		or reach out at any of the socials above.
	</p>
	<h1>Supporters</h1>
	<p>
		If you would like to support the development of Tangent, please consider supporting me on
		<a target="_blank" rel="noreferrer" href="https://ko-fi.com/taylorhadden">Ko-Fi</a>
		or
		<a target="_blank" rel="noreferrer" href="https://www.patreon.com/taylorhadden">Patreon</a>.
		Tangent is free and is supported through this voluntary support.
	</p>
	<p style:margin-bottom="0">The following people have made exceptional contributions:</p>
	<ul>
		<li>Trevor Slaton</li>
		<li>Paul Williams</li>
		<li>Dormouse</li>
		<li>Jose Quesada</li>
		<li>Ethan LP</li>
	</ul>
</main>

<style lang="scss">
.tangent {
	color: var(--accentTextColor);
}

main {
	padding: 0 2em;
	font-size: 90%;
}

.logo {
	background-image: url('tangent-icon.svg');
	background-repeat: no-repeat;
	background-position: center;
	height: 8em;
}

.version {
	text-align: center;
	color: var(--deemphasizedTextColor);
	font-style: italic;
}

ul {
	column-count: 2;
}
</style>
