<script lang="ts">
import SVGIcon from "../smart-icons/SVGIcon.svelte"

export let layout: 'fill' | 'auto' = 'fill'
export let extraTop = 0
</script>

<div class={'empty ' + layout} style:margin-top={extraTop + 'px'}>
	<SVGIcon
		ref="tangent-icon-nocolor.svg#icon"
		size="256"
		styleString="--iconStroke: var(--embossedBackgroundColor);"
		/>
</div>

<style lang="scss">
.empty {
	color: var(--deemphasizedTextColor);
	font-style: italic;

	:global(svg) {
		display: block;
	}

	&.fill {
		position: absolute;
		inset: 0;

		display: flex;
		flex-direction: column;
		
		align-items: center;
		justify-content: center;
	}
}
</style>