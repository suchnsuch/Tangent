<script lang="ts">
import type AttachmentRule from 'common/settings/AttachmentRule';

export let rule: AttachmentRule
$: rulePath = rule.path
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main on:click>
	<span class="folder">
		{#if $rulePath}
			{$rulePath}
		{:else}
			Workspace Root
		{/if}
	</span>
</main>

<style lang="scss">
main {
	background: var(--backgroundColor);
	border-radius: 2px;
	padding: .25em 1em;
	margin: .5em 0;
	
	border: 2px solid var(--backgroundColor);

	&:first-child {
		margin-top: 0;
	}

	&:hover {
		cursor: pointer;
		border-color: var(--accentBackgroundColor);
	}
}

.folder {
	color: var(--deemphasizedTextColor);
	margin-left: 1em;
}
</style>
