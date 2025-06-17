<script lang="ts">
import { computePosition } from '@floating-ui/dom'
import SvgIcon from 'app/views/smart-icons/SVGIcon.svelte'
import { applyCollapseChange, CollapseChange, collapseSection, expandSection, lineHasCollapsedChildren, isLineCollapsible, isLineCollapsed } from 'common/markdownModel/sections'
import { Editor } from 'typewriter-editor'

export let editor: Editor
export let lineElement: HTMLElement

$: lineIndex = (editor && lineElement)
	? Array.prototype.indexOf.call(lineElement.parentNode.children, lineElement)
	: -1

$: lineCollapseIcon = getLineCollapseIcon(lineIndex)
function getLineCollapseIcon(index: number) {
	return lineIndex >= 0 && lineHasCollapsedChildren(editor.doc.lines[index]) ?
		"collapse.svg#closed" : "collapse.svg#open"
}

let container: HTMLElement = null

$: positionOnLine(lineElement, container)
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
	const doc = editor.doc
	const line = doc.lines[lineIndex]

	let collapse: CollapseChange

	if (lineHasCollapsedChildren(line)) {
		console.log('expanding')
		collapse = expandSection(doc, line)
	}
	else {
		console.log('collapsing')
		collapse = collapseSection(doc, line)
	}

	applyCollapseChange(collapse, editor.change).apply()
	lineCollapseIcon = getLineCollapseIcon(lineIndex)
}

</script>

{#if lineElement}
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div bind:this={container}>
	{#if isLineCollapsible(editor.doc, lineIndex)}
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