<script lang="ts">
import type TagViewState from 'app/model/nodeViewStates/TagViewState'
import SvgIcon from '../smart-icons/SVGIcon.svelte'
import SetLensSelector from './common/SetLensSelector.svelte'

export let state: TagViewState

$: info = state.tagInfo
</script>

<div class="lens-settings-row">
	<SvgIcon ref="tag.svg#tag" />
	<header>{state.node.names.join('/')}</header>
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
