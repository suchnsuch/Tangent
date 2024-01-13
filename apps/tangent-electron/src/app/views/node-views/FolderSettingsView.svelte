<script lang="ts">
import type { FolderViewState } from 'app/model/nodeViewStates'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte';
import SvgIcon from '../smart-icons/SVGIcon.svelte';
import SetLensSelector from './common/SetLensSelector.svelte'

export let state: FolderViewState

$: info = state.folderInfo
</script>
<div class="lens-settings-row">
	<SvgIcon ref="folder.svg#folder" />
	<WorkspaceFileHeader node={state.node} showExtension={false} />
</div>
<div class="lens-settings-row">
	<SetLensSelector info={$info} />
	<slot></slot>
</div>

<style lang="scss">
.lens-settings-row {
	> :global(header) {
		margin: 0;
		padding: .25em 0;
		font-size: 200%;
		flex-grow: 1;
	}
}
</style>