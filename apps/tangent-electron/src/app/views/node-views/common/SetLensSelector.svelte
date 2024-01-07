<script lang="ts">
import type SetInfo from 'common/dataTypes/SetInfo';

export let info: SetInfo

// TODO: This should be pulled from the WorkspaceViewState
const lenses = ['Cards', 'Feed']

$: displayMode = info.displayMode

</script>

<label>
	Display As
	<select bind:value={$displayMode}>
		{#each lenses as lens}
			<option value={lens}>{lens}</option>
		{/each}
	</select>
</label>

<style lang="scss">
label {
	display: inline-flex;
	align-items: center;
	margin: 0.25em 0;
}
select {
	margin-left: .25em;
}
</style>