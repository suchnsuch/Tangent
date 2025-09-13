<script lang="ts">
import { fly } from 'svelte/transition'
import type { ImageViewState } from 'app/model/nodeViewStates'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'
import { clamp } from 'common/utils';

export let state: ImageViewState
export let editable: boolean = true

export let layout: 'fill' | 'auto' = 'fill'

let container: HTMLElement

let zoom = state.zoom
let panX = state.panX
let panY = state.panY

let dragging = false
let isHoveringControls = false

$: file = state.file
$: isTransformed = $zoom !== 1 || $panX !== 0 || $panY !== 0

function onWheel(event: WheelEvent) {
	container.focus()
	if (event.ctrlKey) {
		event.preventDefault()
		zoom.applyWheelEvent(event)
	}
	else if ($zoom !== 1) { // Helps when in tangent view
		event.preventDefault()
		$panX = $panX + event.deltaX * -1 * (1/$zoom)
		$panY = $panY + event.deltaY * -1 * (1/$zoom)
	}
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape' && isTransformed) {
		event.preventDefault()
		resetTransform()
	}
}

function mouseDown(event: MouseEvent) {

	event.preventDefault()
	container.focus()

	if (event.altKey) {
		let targetZoom = $zoom
		if (event.shiftKey) {
			targetZoom *= .75
		}
		else {
			targetZoom *= 1.75
		}
		$zoom = clamp(targetZoom, .1, 5)
	}
	else {
		dragging = true
		const endDrag = () => {
			dragging = false
		}
		document.addEventListener('mouseup', endDrag, { once: true })
		document.addEventListener('mouseleave', endDrag, { once: true })
	}
}

function onMouseMove(event: MouseEvent) {
	if (dragging) {
		$panX = $panX + event.movementX * (1/$zoom)
		$panY = $panY + event.movementY * (1/$zoom)
	}

	isHoveringControls = event.clientY > container.getBoundingClientRect().bottom - 100
}

function resetTransform() {
	$zoom = 1
	$panX = 0
	$panY = 0
}
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<main bind:this={container}
	class:layout-fill={layout === 'fill'}
	on:wheel={onWheel}
	on:keydown={onKeydown}
	on:mousemove={onMouseMove}
	tabindex="-1">
	<WorkspaceFileHeader
		node={state.file}
		{editable}/>
	<img
		class:dragging
		src={$file.cacheBustPath} alt={state.node.name}
		style={`transform: scale(${$zoom}) translate(${$panX}px, ${$panY}px);`}
		on:mousedown={mouseDown}/>
	{#if isTransformed || isHoveringControls}
		<div class="controls" transition:fly={{ y: 100 }}>
			<button class="zoomText" on:click={resetTransform}>{Math.round($zoom * 100)}%</button>
			<input class="zoomSlider" type="range" min="{zoom.range.min}" max={zoom.range.max} step="0.1" bind:value={$zoom}/>
		</div>
	{/if}
</main>

<style lang="scss">
main {
	background: var(--noteBackgroundColor);

	&.layout-fill {
		padding-top: var(--topBarHeight);
		position: absolute;
		inset: 0;
	}

	:global(header) {
		position: relative;
		z-index: 1;
	}
}
img {
	max-width: 100%;
	display: block;
	margin: 0 auto;
	cursor: grab;

	&.dragging {
		cursor: grabbing;
	}
}

:global(.alt-pressed) img {
	cursor: zoom-in;
}

:global(.alt-pressed.shift-pressed) img {
	cursor: zoom-out;
}

.controls {
	position: absolute;
	z-index: 1;
	left: 1em;
	bottom: 1em;

	display: flex;
	flex-direction: row;
	gap: .5em;
}

.zoomText {
	width: 4em;
}
.zoomSlider {
	width: 12em;
}
</style>