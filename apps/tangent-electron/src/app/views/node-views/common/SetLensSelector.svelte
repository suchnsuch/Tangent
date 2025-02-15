<script lang="ts">
import SettingView from 'app/views/System/SettingView.svelte';
import type SetInfo from 'common/dataTypes/SetInfo'
import { SetLensMode } from 'common/dataTypes/SetInfo'
import { ForwardingStore } from 'common/stores'

export let info: SetInfo

let displayMode = new ForwardingStore<SetLensMode>(null)
$: displayMode.forwardFrom(info?.displayMode)

</script>

{#if info?.displayMode}
	<SettingView
		setting={info?.displayMode}
		name="Display As"
		display="inline"
		form="select"
		showReset={false}
	/>
{/if}
