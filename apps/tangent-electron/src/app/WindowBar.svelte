<script lang="ts">
import type WindowAPI from "common/WindowApi";

import { getContext } from "svelte";
import { isMac } from 'common/isMac'

let api: WindowAPI = getContext('api')

export let showBorder = false
export let visible = true

</script>

<nav class="WindowBar" class:mac={isMac} class:bordered={showBorder} class:visible>

	<slot name="left"></slot>

	<span class="center-gap"></span>

	<slot name="right"></slot>

	{#if !isMac}
		<div class="windowButtons buttonGroup">
			<button class="minimize subtle" on:click={e => api.window.minimize()}><svg>
				<use href="window.svg#minimize" />
			</svg></button>
			<button class="toggleMaximize subtle" on:click={e => api.window.toggleMaximize()}><svg>
				<use href="window.svg#toggleMaximize" />
			</svg></button>
			<button class="close subtle" on:click={e => api.window.close()}><svg>
				<use href="window.svg#close" />
			</svg></button>
		</div>
	{/if}
</nav>

<style lang="scss">
nav {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	overflow: hidden;
	height: var(--topBarHeight);
	z-index: 10;

	background-color: var(--backgroundColor);

	-webkit-app-region: drag;

	display: flex;
	align-items: stretch;

	transition: transform .3s, opacity .3s;

	padding-left: 4px;

	&.mac {
		padding-left: 80px;
		padding-right: 4px;
	}

	&.bordered {
		border-bottom: 1px solid var(--borderColor);
	}

	&:not(.visible):not(:hover) {
		transform: translateY(calc(var(--topBarHeight) * -1));
		opacity: 0;
	}

	.center-gap {
		flex-grow: 1;
	}

	.windowButtons {
		margin-left: .5em;
		-webkit-app-region: no-drag;
		button {
			border-radius: 0;
			padding: 6px;
		}
		.close {
			&:hover {
				background-color: #bb0000;
			}
			&:active {
				background-color: #990000;
			}
		}
		svg {
			width: 24px;
			height: 24px;
		}
	}
}
</style>