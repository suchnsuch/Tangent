<script lang="ts">
import { sizeToStyle } from './smartIcons'

/**
 * This is a convenience component for placing svg elements
*/

/**
 * The width & height
 */
export let size: number | string = undefined
export let width: number | string = undefined
export let height: number | string = undefined

/**
 * The file.svg#header reference or references
 */
export let ref: string | string[]
export let styleString: string = undefined

let _style = ''

$: {
	_style = sizeToStyle(size, width, height)

	if (styleString) {
		_style += styleString
	}
}
$: references = typeof ref === 'string' ? [ref] : ref
</script>

<svg style={_style}>
{#each references as reference}
	<use href={reference}/>
{/each}
</svg>
