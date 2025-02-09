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

<svg style={_style}>
{#each iconForNode(node) as icon}
	<use href={icon}/>
{/each}
</svg>
	