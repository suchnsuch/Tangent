<script lang="ts">
import type ExternalCommand from 'common/settings/ExternalCommand'

export let command: ExternalCommand
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main on:click>
	<span class="name">
		{command.name.value}
	</span>
	<span class="folder">
		{command.description.value}
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
	flex-wrap: nowrap;
	max-width: 100%;
	overflow: hidden;

}

.name {
	flex-shrink: 0; /* keeps the first part from shrinking */
	overflow: hidden;
	white-space: nowrap;
}
.folder {
	color: var(--deemphasizedTextColor);
	flex: 0 1 auto;
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
