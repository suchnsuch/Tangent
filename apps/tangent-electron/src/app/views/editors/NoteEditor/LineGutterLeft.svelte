<script lang="ts">
import { isLineCollapsible } from 'common/markdownModel/sections'
import { tooltip } from 'app/utils/tooltips'
import SvgIcon from 'app/views/smart-icons/SVGIcon.svelte'
import LineGutter from './LineGutter.svelte'
import MarkdownEditor from './MarkdownEditor'

export let editor: MarkdownEditor
export let target: { element: HTMLElement, index: number }

$: lineCollapseIcon = getLineCollapseIcon(target?.index ?? -1)
function getLineCollapseIcon(index: number) {
	return index >= 0 && editor.collapsingSections.lineHasCollapsedChildren(index) ?
		"collapse.svg#closed" : "collapse.svg#open"
}
$: lineCollapseTooltip = getLineCollapseTooltip(target?.index ?? -1)
function getLineCollapseTooltip(index: number) {
	return index >= 0 && editor.collapsingSections.lineHasCollapsedChildren(index) ?
		"Open this section" : "Collapse this section"
}

function toggleLineCollapse() {
	const index = target?.index
	if (index !== undefined) {
		editor.collapsingSections.toggleLineCollapsed(index)
		lineCollapseIcon = getLineCollapseIcon(index)
	}
}

</script>

<LineGutter {editor} {target} side="left" let:doc>
	{#if isLineCollapsible(doc.lines, target.index)}
		<button class="subtle collapse"
			on:click={toggleLineCollapse}
			use:tooltip={lineCollapseTooltip}
		>
			<SvgIcon size={16} ref={lineCollapseIcon} />
		</button>
	{/if}
</LineGutter>

<style>
button {
	padding: 4px 2px;
	display: flex;
	align-items: center;
}
</style>