<script lang="ts">
    import { onMount } from 'svelte';


export let title: string
export let message: string

type ButtonDefinition = {
	text: string
	tooltip?: string
	click: () => void
}

export let buttons: ButtonDefinition[]

let buttonsContainer: HTMLElement

onMount(() => {
	const lastButton = buttonsContainer.lastElementChild as HTMLElement
	lastButton?.focus()
})

</script>

<main class="ModalContainer">
	<h1>{title}</h1>
	<article>{@html message}</article>
	<nav bind:this={buttonsContainer}>
		{#each buttons as button}
			<button
				class="relaxed focusable"
				title={button.tooltip}
				on:click={button.click}
			>
				{button.text}
			</button>
		{/each}
	</nav>
</main>

<style lang="scss">
main {
	max-width: 450px;
}

h1 {
	text-align: center;
}

article {
	margin: 4em 2em;
}

nav {
	display: flex;
	gap: .5em;
	justify-content: end;
}
</style>
