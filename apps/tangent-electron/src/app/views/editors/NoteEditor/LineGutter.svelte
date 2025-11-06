<script lang="ts">
import { onDestroy } from 'svelte'
import { computePosition } from '@floating-ui/dom'
import { typewriterToText } from 'common/typewriterUtils'
import { findSectionLines, isLineCollapsible } from 'common/markdownModel/sections'
import SvgIcon from 'app/views/smart-icons/SVGIcon.svelte'
import { tooltip } from 'app/utils/tooltips'
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
$: lineCollapseTooltip = getLineCollapseTooltip(target?.index ?? -1)
function getLineCollapseTooltip(index: number) {
	return index >= 0 && editor.collapsingSections.lineHasCollapsedChildren(index) ?
		"Open this section" : "Collapse this section"
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

function getCopyToolTip() {
	const index = target?.index
	if (index === undefined) return

	const line = editor.doc.lines.at(index)
	if (!line) return

	let tooltip = 'Copy this section.'

	if ('code' in line.attributes ||
		'front_matter' in line.attributes ||
		'math' in line.attributes
	) {
		tooltip += ' Hold shift to copy block formatting.'
	}
	return tooltip
}

function copySection(event: MouseEvent) {
	const index = target?.index
	if (index === undefined) return

	const line = editor.doc.lines.at(index)
	if (!line) return

	const { lines } = findSectionLines(editor.doc, [line], false)
	if (!lines.length) return

	let text = typewriterToText(lines)

	if (!event.shiftKey) {
		// Truncate blocks to not include the opening & closing formatting
		if ('code' in line.attributes) {
			text = text.replace(/^```\w+\n/m, '').replace(/\n```$/m, '')
		}
		else if ('math' in line.attributes) {
			text = text.replace(/^\$\$\n/m, '').replace(/\n\$\$$/m, '')
		}
		else if ('front_matter' in line.attributes) {
			text = text.replace(/^---\n/m, '').replace(/\n---$/m, '')
		}
	}

	console.log(text)

	navigator.clipboard.writeText(text)
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
		<button class="subtle collapse copy"
			on:click={copySection}
			use:tooltip={getCopyToolTip()}
		>
			<SvgIcon size={16} ref={['file.svg#clipboard']} />
		</button>
		<button class="subtle collapse"
			on:click={toggleLineCollapse}
			use:tooltip={lineCollapseTooltip}
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
	padding-right: 4px;
}

.collapse {
	padding: 4px 2px;
	display: flex;
	align-items: center;
}

.copy {
	opacity: 0;
	transition: opacity .5s;
	:hover > & {
		transition-delay: .75s;
		opacity: 1;

		&:hover {
			transition: none;
		}
	}
}
</style>
