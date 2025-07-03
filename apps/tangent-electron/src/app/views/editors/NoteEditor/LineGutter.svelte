<script lang="ts">
import { onDestroy } from 'svelte'
import { computePosition } from '@floating-ui/dom'
import SvgIcon from 'app/views/smart-icons/SVGIcon.svelte'
import { isLineCollapsible } from 'common/markdownModel/sections'
import type MarkdownEditor from './MarkdownEditor'

export let editor: MarkdownEditor
export let target: { element: HTMLElement, index: number }

let doc = editor.doc

editor.on('changed', onEditorChanged)

onDestroy(() => {
	editor.off('changed', onEditorChanged)
})

function onEditorChanged() {
	doc = editor.doc
}

$: lineCollapseIcon = getLineCollapseIcon(target?.index ?? -1)
function getLineCollapseIcon(index: number) {
	return index >= 0 && editor.collapsingSections.lineHasCollapsedChildren(index) ?
		"collapse.svg#closed" : "collapse.svg#open"
}

let container: HTMLElement = null

$: positionOnLine(target?.element, container)
function positionOnLine(line: HTMLElement, container: HTMLElement) {
	if (!line || !container) return

	computePosition(line, container, {
		strategy: 'absolute',
		placement: 'left-start'
	}).then(result => {
		const lineStyle = getComputedStyle(line)
		const marginLeft = parseFloat(lineStyle.marginLeft)
		const lineHeight = parseFloat(lineStyle.lineHeight)

		const containerRect = container.getBoundingClientRect()
		const offset = (lineHeight - containerRect.height) / 2

		container.style.left = result.x - marginLeft + 'px'
		container.style.top = result.y + offset + 'px'
	})
}

function toggleLineCollapse() {
	const index = target?.index
	if (index !== undefined) {
		editor.collapsingSections.toggleLineCollapsed(index)
		lineCollapseIcon = getLineCollapseIcon(index)
	}
}

</script>

{#if target?.element}
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div bind:this={container}>
	{#if isLineCollapsible(doc.lines, target.index)}
		<button class="subtle collapse"
			on:click={toggleLineCollapse}
		>
			<SvgIcon size={16} ref={lineCollapseIcon} />
		</button>
	{/if}
</div>
{/if}

<style lang="scss">
div {
	position: absolute;
	top: 200px;
	left: 0;
	display: flex;
	align-items: center;
}

.collapse {
	padding: 2px;
	margin-right: 4px;
}
</style>
