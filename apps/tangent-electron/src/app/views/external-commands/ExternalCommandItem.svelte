<script lang="ts">
import type ExternalCommandRule from 'common/settings/ExternalCommand';
export let rule: ExternalCommandRule
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main on:click>
	{rule.name}
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
}

.folder {
	color: var(--deemphasizedTextColor);
	margin-left: 1em;
}
</style>
