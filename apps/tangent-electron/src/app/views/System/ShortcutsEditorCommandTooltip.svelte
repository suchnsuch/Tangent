<script lang="ts">
import { WorkspaceCommand } from 'app/model/commands'

export let key: string
export let label: string
export let command: WorkspaceCommand

</script>

<main>
	{#if label}
		<h1>
			<span class="label">{label}</span>
			{#if key}
				<span class="key">{key}</span>
			{/if}
		</h1>
	{/if}
	<p>{command.getTooltip()}</p>
	
</main>

<style>
h1 {
	margin-top: 0;
	font-size: 120%;
	display: flex;
	flex-wrap: wrap;
	gap: .5em;
	align-items: baseline;
}
.label {
	flex-grow: 1;
}
.key {
	font-size: 70%;
	font-family: var(--codeFontFamily);
	color: var(--deemphasizedTextColor);
}
</style>