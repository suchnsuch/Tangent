<script lang="ts">
import Nav from './Nav.svelte'
import { page } from '$app/stores'

function getTitle(path: string) {
	if (path.startsWith('/')) {
		path = path.substr(1)
	}
	if (path) {
		return " – " + path
	}
	return ""
}
</script>

<svelte:head>
	<title>Tangent Notes{getTitle($page.url.pathname)}</title>
</svelte:head>

<header>
	<div class="headerContainer">
		<div class="icon"></div>
		<h1>
			Tangent 
		</h1>
		<div class="tagline">Your Brain, Your Notes</div>
	</div>
</header>
<Nav></Nav>

<slot></slot>

<footer>

	<nav style="gap: .8em;">
		Join the Community on
		<a href="https://discord.gg/6VpvhUnxFe" target="_blank" title="Join Tangent's Discord!" style="position: relative; top: 1px;">
			<picture>
				<img src="discord-logo-blue.svg" height="22" alt="The Discord Logo" />
			</picture>
		</a>
		or
		<a href="https://indieapps.space/@tangentnotes" target="_blank" title="Follow Tangent on Mastodon!" style="position: relative; top: 3px;">
			<picture>
				<source srcset="mastodon-wordmark-white-text.svg" media="(prefers-color-scheme:dark)" />
				<img src="mastodon-wordmark-black-text.svg" height="22" alt="The Mastodon Logo" />
			</picture>
		</a>
	</nav>

	<nav style="gap: .8em;">
		Help develop Tangent on
		<a href="https://github.com/suchnsuch/Tangent" target="_blank" title="Tangent on Github!" style="position: relative; top: 0px;">
			<picture>
				<source srcset="GitHub_Lockup_Light.svg" media="(prefers-color-scheme:dark)" />
				<img src="GitHub_Lockup_Dark.svg" height="22" alt="The Github Logo" />
			</picture>
		</a>
	</nav>

	<a class="hidden" rel="me" href="https://indieapps.space/@tangentnotes">Mastodon</a>
	
	<Nav></Nav>
</footer>

<style lang="scss">
header {
	background-color: var(--backgroundColor);
	padding: 1em;
	padding-bottom: 0;

	position: relative;
	z-index: 2;
}

.headerContainer {
	max-width: var(--pageWidth);
	margin: 0 auto;

	position: relative;

	display: grid;
	grid-template:
		"icon header"
		"tagline tagline" /
		auto 1fr;
}
h1 {
	font-weight: 200;
	font-size: 400%;
	margin: 0;
	color: var(--accentTextColor);
}
.tagline {
	color: var(--textColor);
	font-weight: 200;
	margin-left: 1em;

	grid-area: tagline;
	text-align: right;
}

.icon {
	width: 64px;
	height: 64px;
	margin-right: 1em;
	background-image: url("/tangent-icon.svg");
	background-repeat: no-repeat;
	background-position: center;
	flex-shrink: 0;

	place-self: center;
}

footer {
	max-width: var(--pageWidth);
	margin: 0 auto;
	margin-top: 4em;

	flex-grow: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

nav {
	padding-bottom: 2em;
	color: var(--deemphasizedTextColor);

	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: .32em;

	a {
		color: var(--deemphasizedTextColor);
		text-decoration: none;

		img {
			position: relative;
			top: 1px;
		}
	}
}

@media (min-width: 500px) {
	.headerContainer {
		grid-template:
			"icon header tagline"/
			auto auto 1fr;
		align-items: baseline;
	}

	.tagline {
		text-align: left;
	}
}

@media (min-width: 700px) {
	.headerContainer {
		display: flex;
		align-items: baseline;
	}

	.icon {
		width: 98px;
		height: 98px;
		position: absolute;
		top: 0px;
		left: -110px;
		z-index: 1;
	}
}

@media (max-width: 400px) {
	footer nav {
		text-align: center;
		flex-direction: column;
	}
}

.hidden {
	display: none;
}
</style>
