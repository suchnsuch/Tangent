<script lang="ts">
import type { FolderViewState } from 'app/model/nodeViewStates'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'
import SetLensSelector from './common/SetLensSelector.svelte'

export let state: FolderViewState

$: info = state.folderInfo
</script>
<div class="lens-settings-row">
	<WorkspaceFileHeader node={state.node} showExtension={false} />
</div>
<div class="lens-settings-row">
	{#if !state.isLensOverridden}
		<SetLensSelector info={$info}/>
	{/if}
	<slot></slot>
</div>
