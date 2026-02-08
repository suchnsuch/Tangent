<script lang="ts">
import { templateLookup } from "common/markdownModel/templates"

let {
	token
}: {
	token: string
} = $props()

let definition = $derived(templateLookup[token])

let message = $derived.by(() => {
	const description = definition.description
	return description.substring(0, 1).toLocaleLowerCase() + description.substring(1)
})

</script>

<main>
{#if definition}
	<h1>Templating Token</h1>
	<p>When this file is used as a Creation Rule Template, <code>{token}</code> will be replaced by {message}</p>
{/if}
</main>

<style lang="scss">
h1 {
	font-size: 110%;
	margin: 0 0 1em;
	padding: 0;
}

code {
	color: var(--templateTokenTextColor);
}
</style>
