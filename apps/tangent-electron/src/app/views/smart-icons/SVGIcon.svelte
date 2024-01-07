<script lang="ts">
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

function rawOrPx(value: string | number) {
	return typeof value === 'number' ? `${value}px` : value
}

$: {
	const realWidth = rawOrPx(width ?? size ?? 24)
	const realHeight = rawOrPx(height ?? size ?? 24)

	_style = `width: ${realWidth}; height: ${realHeight};`

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
