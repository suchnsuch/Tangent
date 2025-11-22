<script lang="ts">
import { findSectionLines, isLineCollapsible } from 'common/markdownModel/sections'
import { typewriterToText } from 'common/typewriterUtils'
import { tooltip } from 'app/utils/tooltips'
import SvgIcon from 'app/views/smart-icons/SVGIcon.svelte'
import LineGutter from './LineGutter.svelte'
import MarkdownEditor from './MarkdownEditor'

export let editor: MarkdownEditor
export let target: { element: HTMLElement, index: number }

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
</script>

<LineGutter {editor} {target} side="right" let:doc>
	{#if isLineCollapsible(doc.lines, target.index)}
		<button class="subtle collapse"
			on:click={copySection}
			use:tooltip={getCopyToolTip()}
		>
			<SvgIcon size={16} ref={['file.svg#clipboard']} />
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