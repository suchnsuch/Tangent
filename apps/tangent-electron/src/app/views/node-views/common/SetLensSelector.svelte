<script lang="ts">
import type SetInfo from 'common/dataTypes/SetInfo'
import { SetLensMode } from 'common/dataTypes/SetInfo'
import { ForwardingStore } from 'common/stores'

export let info: SetInfo

// TODO: This should be pulled from the WorkspaceViewState
const lenses = ['Cards', 'Feed']

let displayMode = new ForwardingStore<SetLensMode>(null)
$: displayMode.forwardFrom(info?.displayMode)

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