<script lang="ts">
import { PaletteAction } from 'app/model/commands/WorkspaceCommand'
import { SearchMatchResult } from 'common/search'
import { shortcutsHtmlString } from './shortcuts'
import SearchSegmentHighlight from 'app/utils/SearchSegmentHighlight.svelte'

export let action: PaletteAction
export let match: SearchMatchResult = null
export let showShortcut = false

function getActionShortcutString(action: PaletteAction) {
	return shortcutsHtmlString((action.shortcuts ?? action.command.shortcuts)[0])
}

</script>

<div class="action" class:enabled={action.command.canExecute(action.context)}>
	<span class="name"><SearchSegmentHighlight value={match ?? action.name}/></span>
	{#if showShortcut}
		<span class="shortcut">{@html getActionShortcutString(action)}</span>
	{/if}
</div>

<style>
div {
	display: flex;
	align-items: center;
	&:not(.enabled) {
		opacity: .6;
	}
}
.name {
	flex-grow: 1;
}
.shortcut {
	font-size: smaller;
	opacity: .7;
}
</style>