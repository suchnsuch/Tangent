<script lang="ts">

export let message: string

let title: string = null
let details = message

const breakIndex = message.indexOf('\n')
if (breakIndex) {
	title = message.substring(0, breakIndex)
	details = message.substring(breakIndex)
}

</script>

<main>
	{#if title}
		<h1>{title}</h1>
	{/if}
	<pre>{details}</pre>
</main>

<style lang="scss">
h1 {
	font-size: 110%;
	margin: 0;
	padding: 0;
}
pre {
	font-family: var(--codeFontFamily);
	white-space: pre-wrap;
	margin: 0 2em;
}
</style>