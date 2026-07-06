<script lang="ts">
import type CreationRule from 'common/settings/CreationRule'
import CreationRuleName from '../summaries/CreationRuleName.svelte'

export let rule: CreationRule
$: ruleFolder = rule.folder
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main on:click>
	<CreationRuleName {rule}/>
	<span class="folder">
		in
		{#if $ruleFolder}
			"{$ruleFolder}"
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
