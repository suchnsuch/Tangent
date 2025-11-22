<script lang="ts">
import { onDestroy } from 'svelte'
import { computePosition } from '@floating-ui/dom'
import type MarkdownEditor from './MarkdownEditor'

export let editor: MarkdownEditor
export let target: { element: HTMLElement, index: number }
export let side: 'left'|'right'

let doc = editor.doc

editor.on('changed', onEditorChanged)

onDestroy(() => {
	editor.off('changed', onEditorChanged)
})

function onEditorChanged() {
	doc = editor.doc
}

let container: HTMLElement = null

$: positionOnLine(target?.element, container)
function positionOnLine(line: HTMLElement, container: HTMLElement) {
	if (!line || !container) return

	computePosition(line, container, {
		strategy: 'absolute',
		placement: side === 'left' ? 'left-start' : 'right-start'
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

</script>

{#if target?.element}
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div bind:this={container} class={side}>
	<slot {doc} />
</div>
{/if}

<style lang="scss">
div {
	position: absolute;
	top: 200px;
	display: flex;
	align-items: center;
	
	&.left {
		left: 0;
		padding-right: 4px;
	}
	&.right {
		right: 0;
		padding-left: 4px;
	}
}
</style>
