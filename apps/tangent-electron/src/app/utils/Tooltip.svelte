<script lang="ts">
import { autoUpdate, computePosition, flip, inline, offset, shift, VirtualElement } from '@floating-ui/dom'
import { cubicInOut } from 'svelte/easing'
import { dropTooltip, pinTooltip, TooltipConfig } from './tooltips'
import { onDestroy, setContext } from 'svelte'

export let origin: HTMLElement
export let config: TooltipConfig

export let injectContext: (injector: ((name: string, value: any) => void)) => void = null

if (injectContext) {
	injectContext(setContext)
}

let cleanup: () => void = null

let tooltipElement: HTMLElement = null

function positionedFly(element: HTMLElement) {

	if (config.placement) {

		let effectiveOrigin: HTMLElement | VirtualElement = origin
		let placement = config.placement

		if (typeof placement !== 'string') {
			const event = placement
			console.log(event.clientX, event.clientY)
			effectiveOrigin = {
				getBoundingClientRect() {
					return {
						width: 0,
						height: 0,
						x: event.clientX,
						y: event.clientY,
						top: event.clientY,
						left: event.clientX,
						right: event.clientX,
						bottom: event.clientY
					}
				},
				contextElement: origin
			}
			placement = 'bottom-start'
		}

		cleanup = autoUpdate(effectiveOrigin, element, () => {
			computePosition(effectiveOrigin, element, {
				strategy: 'fixed',
				placement,
				middleware: [
					flip(),
					offset(4),
					shift()
				]
			}).then(result => {
				element.style.left = result.x + 'px'
				element.style.top = result.y + 'px'
			})
		})
	}
	
	return {
		delay: 0,
		duration: 150,
		easing: cubicInOut,
		css: (t: number, u: number) => {
			return `transform: translate(0, ${-10 * u}px) scaleY(${1 - u * .5}); opacity: ${.9 * t};`
		}
	}
}

onDestroy(() => {
	if (cleanup) cleanup()
})

function onMouseEnter() {
	if (config.interactive) {
		pinTooltip(origin)
	}
}

function onMouseLeave() {
	if (config.interactive) {
		dropTooltip(origin)
	}
}

</script>

<main
	bind:this={tooltipElement}
	transition:positionedFly
	on:introstart={() => tooltipElement.style.pointerEvents = 'none'}
	on:introend={() => tooltipElement.style.pointerEvents = ''}
	on:mouseenter={onMouseEnter}
	on:mouseleave={onMouseLeave}
	style:max-width={config.maxWidth ?? '300px'}
>
	{#if typeof config.tooltip === 'string'}
		<p>
			{@html config.tooltip}
			{#if config.shortcut}
				<span class="shortcut">{config.shortcut}</span>
			{/if}
		</p>
	{:else}
		<svelte:component this={config.tooltip} {...config.args}/>
	{/if}
</main>

<style lang="scss">
main {
	z-index: 1000000000000001;

	position: fixed;
	top: 0;
	left: 0;
	width: fit-content;
	max-width: 300px;

	font-size: max(80%, 10px);
	
	background-color: var(--transparentBackgroundColor);
	backdrop-filter: blur(20px);

	padding: .5em;
	border-radius: var(--inputBorderRadius);
	border: 1px solid var(--borderColor);
	
	box-shadow: 0 0 5px rgba(0, 0, 0, .3);
}

p {
	margin: 0 .25em;
}

.shortcut {
	padding-left: .66em;
	color: var(--deemphasizedTextColor);
}
</style>
