<script lang="ts">
import type AttachmentRule from 'common/settings/AttachmentRule';

export let rule: AttachmentRule
$: rulePath = rule.path
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main on:click>
  {#if $rulePath}
    {$rulePath}
  {:else}
    Workspace Root
  {/if}
  <span class="folder">
    {rule.description.value}
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
	display: flex; 
	align-items: center; 
	gap: 0.5em;
}

.folder {
	color: var(--deemphasizedTextColor);
	margin-left: 1em;
	display: inline-block;
	max-width: 100%; /* or calc(100% - 100px) */
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	vertical-align: bottom;
}
</style>
