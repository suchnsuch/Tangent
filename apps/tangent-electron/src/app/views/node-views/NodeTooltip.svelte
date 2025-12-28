<script lang="ts">
import { wait } from '@such-n-such/core'
import type { TreeNode } from 'common/trees'
import NodePreview from '../summaries/NodePreview.svelte'
import NodeLine from '../summaries/NodeLine.svelte'

export let node: TreeNode
export let previewDelay = 3

let timeout = wait(previewDelay * 1000)

</script>

<main>
	{#await timeout}
		<div class="line">
			<NodeLine {node} showFileType={true} shrinkNonHighlights={false} />
		</div>
	{:then}
		<div class="preview margins-tight">
			<NodePreview item={node} layout="auto" />
		</div>
	{/await}
</main>

<style lang="scss">
.preview {
	max-height: 20em;
	--fontSize: calc(var(--noteFontSize) * .8);
	--headerFontSizeFactor: 2.25;

	overflow-x: hidden;
	overflow-y: auto;

	:global(.noteEditor) {
		pointer-events: none;
	}
}
</style>