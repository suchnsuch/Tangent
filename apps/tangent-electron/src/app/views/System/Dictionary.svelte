<script lang="ts">
import { getContext } from 'svelte'
import { Workspace } from 'app/model'
    import SvgIcon from '../smart-icons/SVGIcon.svelte';

const workspace = getContext('workspace') as Workspace

let dictionaryPromise = workspace.api.dictionary.getAllWords()

function deleteWord(word: string) {
	workspace.api.dictionary.removeWord(word)
	dictionaryPromise = workspace.api.dictionary.getAllWords()
}

</script>

<main>
	<h2>Dictionary</h2>
	{#await dictionaryPromise}
		<p>Loading Dictionary…</p>
	{:then list} 
		<p class="info">
			These are the words you have saved to the custom dictionary.
			You can remove them here if any were added in error.
		</p>
		<ul>
			{#each list as item}
				<li>
					<button
						class="delete"
						title={`Remove "${item}" from the dictionary`}
						on:click={e => deleteWord(item)}
					>
						<SvgIcon ref="close.svg#close" size={16} />
					</button>
					{item}
				</li>
			{/each}
		</ul>
	{/await}
</main>

<style lang="scss">
.info {
	color: var(--deemphasizedTextColor);
	padding: 1em 3em;
	margin: 0;
}

ul {
	list-style: none;
}

li {
	padding: .125em .25em;
	display: flex;
	gap: .5em;
}

button.delete {
	display: inline-flex;
	padding: 0;
	visibility: hidden;
}

li:hover button.delete {
	visibility: visible;
}
</style>
