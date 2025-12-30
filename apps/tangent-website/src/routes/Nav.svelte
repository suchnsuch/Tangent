<script lang="ts">
import { page } from '$app/stores'

interface LinkInfo {
	link: string
	name: string
}
type Link = LinkInfo | string
const links = [
	{ link: '/', name: 'Home' },
	'Download',
	'Features',
	'Roadmap',
	'About'
]

function linkPath(link: Link) {
	if (typeof link === 'string') {
		return '/' + link
	}
	return link.link
}

function linkName(link: Link) {
	if (typeof link === 'string') {
		return link
	}
	return link.name
}
</script>

<nav>
	<div class="links">
		{#each links as link}
			<a class:active={$page.url.pathname === linkPath(link)} href={linkPath(link)}>{linkName(link)}</a>
		{/each}
	</div>
</nav>

<style lang="scss">
nav {
	position: sticky;
	top: 0;
	z-index: 1;

	background: var(--backgroundColor);
	
	.links {
		display: flex;
		justify-content: flex-end;
		max-width: var(--pageWidth);
		margin: 0 auto;
	}

	a {
		padding: .5em 1em;
		color: var(--textColor);

		transition: color .5s;

		&.active {
			color: var(--accentTextColor);
		}
	}
}

:global(footer) nav {
	position: relative;

	font-size: 80%;
	background: none;

	.links {
		justify-content: center;
	}

	a {
		padding: .5em 1em;
	}
}

@media (max-width: 550px) {
	nav a {
		padding: .5em .33em !important;
	}
}
</style>