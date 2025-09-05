<script lang="ts">
import { TreeNode } from 'common/trees'
import { sizeToStyle } from './smartIcons'
import { iconForNode } from 'common/icons'

export let node: TreeNode

export let size: number | string = undefined
export let width: number | string = undefined
export let height: number | string = undefined

let _style = sizeToStyle(size, width, height)
</script>

<svg style={_style} viewBox="0 0 24 24">
{#each iconForNode(node) as icon}
	<use href={icon}/>
{:else}
	<symbol id={'text' + node.fileType} viewBox="0 0 24 24">
		<text x="6" y="18" textLength="12" lengthAdjust="spacingAndGlyphs" style="font: 5px monospace; fill: var(--iconStroke, black);">
			{node.fileType}
		</text>
	</symbol>
	<use href="file.svg#document" />
	<use href={'#text' + node.fileType} />
{/each}
</svg>
	