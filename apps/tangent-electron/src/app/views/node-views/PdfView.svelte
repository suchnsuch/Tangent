<script lang="ts">
import { getContext, onDestroy } from 'svelte'
import { Workspace } from 'app/model'
import PdfViewState from 'app/model/nodeViewStates/PdfViewState'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'

import * as pdfjs from 'pdfjs-dist'
import * as pdfviewer from 'pdfjs-dist/web/pdf_viewer.mjs'
import { resizeObserver } from 'app/utils/resizeObserver'
import { scrollTo, startDrag } from 'app/utils'
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


const drawingDelay = 150

function onWheel(event: WheelEvent) {
	container.focus()

	if (event.ctrlKey) {
		event.preventDefault()

		const [newZoom, oldZoom] = zoom.applyWheelEvent(event)
		const containerBB  = container.getBoundingClientRect()
		const relativeCursorPos = [event.clientX - containerBB.left, event.clientY - containerBB.top]
	
		viewer.updateScale({ drawingDelay, scaleFactor: newZoom/oldZoom, origin: relativeCursorPos })
		$zoom = parseFloat(viewer._currentScaleValue)
	}
	else {
		event.preventDefault()
		const dx = event.deltaX * (1 / $zoom)
		const dy = event.deltaY * (1 / $zoom)

		// shift key changes direction of scroll
		container.scrollLeft += event.shiftKey ? dy : dx 
		container.scrollTop += event.shiftKey ? dx : dy
	}
}

let canPan = false
let isPanning = false

function onMouseDown(event: MouseEvent) {
	if (canPan && event.button == 0) {
		isPanning = true
		event.preventDefault()
		startDrag({
			move: (event: PointerEvent) => {
				event.preventDefault()
				container.scrollLeft -= event.movementX * (1 / $zoom)
				container.scrollTop -= event.movementY * (1 / $zoom)
			},
			end: (event: PointerEvent) => {
				event.preventDefault()
				isPanning = false
			}
		})
	}
}

function onKeyDown(event: KeyboardEvent) {
	if (event.key == " "){
		event.preventDefault()
		canPan = true
	}
}
function onKeyUp(event: KeyboardEvent) {
	if (event.key == " "){
		event.preventDefault()
		canPan = false
	}
}

function setZoom(zoomValue: number | 'auto') {
	if (zoomValue == 'auto') {
		viewer.currentScaleValue = zoomValue
	}
	else {
		const countainerBB = container.getBoundingClientRect()
		viewer.updateScale({ 
			drawingDelay, 
			scaleFactor: zoomValue / parseFloat(viewer.currentScaleValue), 
			origin:  [countainerBB.width / 2 , countainerBB.height / 2]
		})
	}
	$zoom = viewer.currentScale
}

function onZoomSet() {
	setZoom($zoom)
}

function onZoomReset() {
	setZoom('auto')
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
			setZoom('auto')
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

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main
	class:layout-fill={layout === 'fill'}
	style:--noteWidthMax={$maxWidth + 'px'}
	style:padding-top={extraTop + 'px'}
	style:padding-bottom={extraBottom + 'px'}
	on:wheel={onWheel}
	on:keydown={onKeyDown}
	on:keyup={onKeyUp}
>
	<WorkspaceFileHeader
		node={state.file}
		{editable}
	/>

	<article use:resizeObserver={onResize}>
		<div class={["container pdfViewer", { canPan, 'panning': isPanning }]} bind:this={container}>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div bind:this={viewerElement}
				on:mousedown={onMouseDown}
				on:click={onClick}
			></div>
		</div>
	</article>

	<div class="controls" // transition:fly={{ y: 100 }}
		style:bottom={`calc(1em + ${extraBottom}px)`}
	>
		<button class="zoomText" on:click={onZoomReset}>{Math.round($zoom * 100)}%</button>
		<input class="zoomSlider" type="range" min="{zoom.range.min}" max={zoom.range.max} step="0.1" bind:value={$zoom} on:input={onZoomSet}/>
	</div>
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

		&.canPan, &.panning {
			:global(.page) {
				// Defeat the cursor customizations of the text preview layer
				pointer-events: none;
			}
		}

		&.canPan {
			cursor: grab;
		}
		&.panning {
			cursor: grabbing;
		}
	}
}

.zoomText{
	width: 6ch; // make the text container not glitch when the zoom value changes from NN to NNN or vice versa
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