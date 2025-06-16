<script lang="ts">
import { computePosition } from '@floating-ui/dom'
import { applyCollapseChange, CollapseChange, collapseSection, expandSection, lineHasCollapsedChildren, isLineCollapsible } from 'common/markdownModel/sections';
import { WritableStore } from 'common/stores';
import { Editor, Line } from 'typewriter-editor'

export let editor: Editor
export let lineElement: HTMLElement

const lockedLine = new WritableStore<HTMLElement>(null)
let lineSwitchTimeout = null

$: if (lineElement) {
	clearTimeout(lineSwitchTimeout)
	lockedLine.set(lineElement)
} else {
	clearTimeout(lineSwitchTimeout)
	lineSwitchTimeout = setTimeout(() => lockedLine.set(null), 300)
}

$: lineIndex = (editor && $lockedLine)
	? Array.prototype.indexOf.call($lockedLine.parentNode.children, $lockedLine)
	: -1

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
		container.style.left = result.x - marginLeft + 'px'
		container.style.top = result.y + 'px'
	})
}

function onMouseEnter() {
	clearTimeout(lineSwitchTimeout)
}
function onMouseLeave() {
	clearTimeout(lineSwitchTimeout)
	lineSwitchTimeout = setTimeout(() => lockedLine.set(null), 300)
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

	console.log(collapse)

	applyCollapseChange(collapse, editor.change).apply()
	console.log(editor.doc.lines.map(l => l.attributes.collapsed))
}

</script>

{#if $lockedLine}
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div bind:this={container}
	on:mouseenter={onMouseEnter}
	on:mouseleave={onMouseLeave}
>
	{#if isLineCollapsible(editor.doc, lineIndex)}
		{lineIndex}
		<button
			on:click={toggleLineCollapse}
		>
			>
		</button>
	{/if}
</div>
{/if}

<style lang="scss">
div {
	position: absolute;
	top: 200px;
	left: 0;
	background: green;
}
</style>