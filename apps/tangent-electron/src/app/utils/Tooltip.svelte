<script lang="ts">
import { autoUpdate, computePosition, flip, offset, Placement, VirtualElement } from '@floating-ui/dom'
import { cubicInOut } from 'svelte/easing'
import { dropTooltip, pinTooltip, TooltipConfig } from './tooltips'
import { onDestroy, setContext } from 'svelte'

export let origin: HTMLElement
export let originEvent: MouseEvent
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

		if (placement.startsWith('mouse')) {
			if (originEvent) {
				
				const newRect = {
					width: 0,
					height: 0,
					x: originEvent.clientX,
					y: originEvent.clientY,
					top: originEvent.clientY,
					left: originEvent.clientX,
					right: originEvent.clientX,
					bottom: originEvent.clientY
				}

				const originRect = origin.getBoundingClientRect()

				if (placement === 'mouse-below-origin') {
					console.log('Placing below element')
					newRect.height = originRect.height
					newRect.y = Math.min(newRect.y, originRect.y)
					newRect.top = Math.min(newRect.top, originRect.y)
					newRect.bottom = Math.max(newRect.bottom, originRect.bottom)
				}

				effectiveOrigin = {
					getBoundingClientRect() {
						return newRect
					},
					contextElement: origin
				}

				placement = 'bottom-start'
			}
			else {
				placement = 'bottom-start'
			}
		}

		cleanup = autoUpdate(effectiveOrigin, element, () => {
			computePosition(effectiveOrigin, element, {
				strategy: 'fixed',
				placement: placement as Placement,
				middleware: [
					offset(4),
					flip(),
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

function getStyle(config: TooltipConfig) {
	let style = ''

	if (config.minWidth) style += `min-width: ${config.minWidth};`
	if (config.maxWidth) style += `max-width: ${config.maxWidth};`

	return style
}

</script>

<main
	bind:this={tooltipElement}
	transition:positionedFly
	on:introstart={() => tooltipElement.style.pointerEvents = 'none'}
	on:introend={() => tooltipElement.style.pointerEvents = ''}
	on:mouseenter={onMouseEnter}
	on:mouseleave={onMouseLeave}
	style={getStyle(config)}
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
	max-width: 50vw;

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
	white-space-collapse: preserve;
}

.shortcut {
	padding-left: .66em;
	color: var(--deemphasizedTextColor);
}
</style>
