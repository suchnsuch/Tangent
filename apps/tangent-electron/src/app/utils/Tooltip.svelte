<script lang="ts">
import { autoUpdate, computePosition, flip, inline, offset, shift, VirtualElement } from '@floating-ui/dom'
import { cubicInOut } from 'svelte/easing'
import { TooltipConfig } from './tooltips'
import { onDestroy, setContext } from 'svelte'

export let origin: HTMLElement
export let config: TooltipConfig
export let moveEvent: MouseEvent

export let injectContext: (injector: ((name: string, value: any) => void)) => void = null

if (injectContext) {
	injectContext(setContext)
}

let cleanup: () => void = null

let tooltipElement: HTMLElement

$: if (!config.placement && moveEvent) {
	mouseRelativePosition(moveEvent, tooltipElement)
}

function mouseRelativePosition(moveEvent: MouseEvent, element: HTMLElement) {

	if (!element) return

	const virtualOrigin: VirtualElement = {
		getBoundingClientRect() {
			return {
				width: 0,
				height: 0,
				x: moveEvent.clientX,
				y: moveEvent.clientY,
				top: moveEvent.clientY,
				left: moveEvent.clientX,
				right: moveEvent.clientX,
				bottom: moveEvent.clientY
			}
		},
		contextElement: origin
	}

	computePosition(virtualOrigin, element, {
		strategy: 'fixed',
		placement: 'bottom-start',
		middleware: [
			flip(),
			offset({
				mainAxis: 12,
				alignmentAxis: 8
			}),
			shift()
		]
	}).then(result => {
		element.style.left = result.x + 'px'
		element.style.top = result.y + 'px'
	})
}

function positionedFly(element: HTMLElement) {

	if (config.placement) {
		cleanup = autoUpdate(origin, element, () => {
			computePosition(origin, element, {
				strategy: 'fixed',
				placement: config.placement,
				middleware: [
					inline({ x: moveEvent.x, y: moveEvent.y }),
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

</script>

<main
	bind:this={tooltipElement}
	transition:positionedFly
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
