<script lang="ts">
import { fly } from 'svelte/transition'
import { getContext, onDestroy } from 'svelte'
import { Workspace } from 'app/model'
import PdfViewState from 'app/model/nodeViewStates/PdfViewState'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'

import * as pdfjs from 'pdfjs-dist'
import * as pdfviewer from 'pdfjs-dist/web/pdf_viewer.mjs'
import { resizeObserver } from 'app/utils/resizeObserver'
import { scrollTo } from 'app/utils'
import { smoothScrollTime } from 'app/utils/style'

const workspace = getContext('workspace') as Workspace
const {
	noteWidthMax: maxWidth,
} = workspace.settings

export let state: PdfViewState
export let editable: boolean = true

export let layout: 'fill' | 'auto' = 'fill'
export let extraTop: number = 0
export let extraBottom: number = 0

$: targetPage = state.targetPage

let container: HTMLDivElement
let viewerElement: HTMLDivElement

let viewer: pdfviewer.PDFViewer = null

let zoom = state.zoom

let isHoveringControls = false
$: isTransformed = $zoom !== 1

function onWheel(event: WheelEvent) {
	container.focus()
	if (event.ctrlKey) {
		event.preventDefault();

		let somePageElement = container.querySelector('.page');

		// Get mouse position relative to element BEFORE zoom
		const rectBefore = somePageElement.getBoundingClientRect();
		const mouseX = event.clientX;
		const mouseY = event.clientY;

		// Calculate mouse position in page coordinates (before zoom)
		const pageXBefore = (mouseX - rectBefore.left) / rectBefore.width;
		const pageYBefore = (mouseY - rectBefore.top) / rectBefore.height;

		// Apply zoom
		zoom.applyWheelEvent(event);
		viewer.currentScale = $zoom;

		// Get element AFTER zoom
		const rectAfter = somePageElement.getBoundingClientRect();

		// Calculate where the mouse should be in page coordinates (same position)
		const pageXAfter = pageXBefore;  // We want the same relative position!
		const pageYAfter = pageYBefore;

		// Calculate the target scroll position to keep mouse fixed
		const targetScrollX = (pageXAfter * rectAfter.width) + rectAfter.left - mouseX;
		const targetScrollY = (pageYAfter * rectAfter.height) + rectAfter.top - mouseY;

		// Apply scroll to keep mouse position fixed
		container.scrollLeft += targetScrollX;
		container.scrollTop += targetScrollY;
	}
	else {
		event.preventDefault()
		container.scrollLeft += event.deltaX * +1 * (1/$zoom) // horizontal pan
  		container.scrollTop += event.deltaY * +1 * (1/$zoom) // vertical pan
	}
}

function resetTransform() {
	viewer.currentScaleValue = 'auto'
	$zoom = viewer.currentScale
}


async function doPDF() {
	let pdf = await pdfjs.getDocument(state.file.cacheBustPath).promise

	viewer = new pdfviewer.PDFViewer({
		container,
		viewer: viewerElement,
		eventBus: new pdfviewer.EventBus()
	})

	viewer.setDocument(pdf)

	onResize(null)
}

onDestroy(() => {
	if (targetInterval) clearInterval(targetInterval)
})

doPDF().catch(e => {
	console.error(e)
})

let targetInterval = null
$: pageTarget($targetPage)
function pageTarget(target: number) {
	if (target < 0) {
		clearInterval(targetInterval)
		targetInterval = null
		return
	}

	// Shouldn't go on forever. Number chosen out of hat (allows for a delay of 2.5s).
	let attemptsRemaining = 20

	function goToTarget() {
		if (!viewerElement) return false

		const targetElement = viewerElement.querySelector(`.page[data-page-number="${target}"]`)
		if (targetElement instanceof HTMLElement) {
			scrollTo({
				target: targetElement,
				duration: smoothScrollTime
			})
			return true
		}

		return false
	}

	if (!goToTarget()) {
		// Is this the best? No. But it works.
		targetInterval = setInterval(() => {
			attemptsRemaining--
			if (goToTarget() || attemptsRemaining === 0) {
				clearInterval(targetInterval)
				targetInterval = null
			}
		}, 150)
	}
}

function onResize(resizeEntries: ResizeObserverEntry[]) {
	if (viewer) {
		viewer.firstPagePromise.then(() => {
			resetTransform()
		})
	}
}

function onClick(event: MouseEvent) {
	if (event.target instanceof HTMLAnchorElement) {
		// Redirect links to the default application
		event.preventDefault()
		//workspace.api.links.openExternal(event.target.href)
		workspace.navigateTo({
			link: {
				form: 'raw',
				href: event.target.href
			},
			origin: state.node
		})
	}
}

</script>

<main
	class:layout-fill={layout === 'fill'}
	style:--noteWidthMax={$maxWidth + 'px'}
	style:padding-top={extraTop + 'px'}
	style:padding-bottom={extraBottom + 'px'}
	on:wheel={onWheel}
>
	<WorkspaceFileHeader
		node={state.file}
		{editable}
	/>

	<article use:resizeObserver={onResize}>
		<div class="container pdfViewer" bind:this={container}>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div bind:this={viewerElement} on:click={onClick}></div>
		</div>
	</article>

	{#if isTransformed || isHoveringControls}
		<div class="controls" transition:fly={{ y: 100 }}
			style:bottom={`calc(1em + ${extraBottom}px)`}
		>
			<button class="zoomText" on:click={resetTransform}>{Math.round($zoom * 100)}%</button>
			<input class="zoomSlider" type="range" min="{zoom.range.min}" max={zoom.range.max} step="0.1" bind:value={$zoom}/>
		</div>
	{/if}
</main>

<style lang="scss">
main {
	&.layout-fill {
		position: absolute;
		inset: 0;
		overflow: auto;
	}

	display: flex;
	flex-direction: column;

	:global(header) {
		width: 100%;
	}
}

article {
	flex-grow: 1;
	position: relative;

	.container {
		position: absolute;
		inset: 0;

		overflow-y: visible;
		overflow-x: auto;

		-webkit-user-select: text;
		user-select: text;
	}
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

</style>
