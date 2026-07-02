<script lang="ts">
import { getContext, onDestroy } from 'svelte'
import { Workspace } from 'app/model'
import PdfViewState from 'app/model/nodeViewStates/PdfViewState'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'

import * as pdfjs from 'pdfjs-dist'
import * as pdfviewer from 'pdfjs-dist/web/pdf_viewer.mjs'
import { resizeObserver } from 'app/utils/resizeObserver'
import { scrollTo } from 'app/utils'
import { smoothScrollTime } from 'app/utils/style'
import { FocusLevel } from 'common/dataTypes/TangentInfo'

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


function OriginalPdfJsOnWheel(evt: WheelEvent) {
	// stolen from https://mozilla.github.io/pdf.js/web/viewer.html at 2026-07-02

	var _wheelUnusedTicks = 0
	var _wheelUnusedFactor = 1

	function normalizeWheelEventDirection(evt: WheelEvent) {
		let delta = Math.hypot(evt.deltaX, evt.deltaY)
		const angle = Math.atan2(evt.deltaY, evt.deltaX)
		if (-0.25 * Math.PI < angle && angle < 0.75 * Math.PI) {
			delta = -delta
		}
		return delta
	}

	function _accumulateFactor(previousScale: number, factor: number) {
		if (factor === 1) {
			return 1
		}
		if (_wheelUnusedFactor > 1 && factor < 1 || _wheelUnusedFactor < 1 && factor > 1) {
			_wheelUnusedFactor = 1
		}
		const newFactor = Math.floor(previousScale * factor * _wheelUnusedFactor * 100) / (100 * previousScale)
		_wheelUnusedFactor = factor / newFactor
		return newFactor
	}

	function updateZoom(steps: number, scaleFactor: number, origin: [number, number]) {
		if (viewer.isInPresentationMode) {
			return
		}
		viewer.updateScale({
			drawingDelay: 400,
			steps,
			scaleFactor,
			origin
		})

		zoom.set(viewer._currentScaleValue)
	}

	function _accumulateTicks(ticks: number) {
		if (_wheelUnusedTicks > 0 && ticks < 0 || _wheelUnusedTicks < 0 && ticks > 0) {
			_wheelUnusedTicks = 0
		}
		_wheelUnusedTicks += ticks
		const wholeTicks = Math.trunc(_wheelUnusedTicks)
		_wheelUnusedTicks -= wholeTicks
		return wholeTicks
	}


	const pdfViewer = viewer
	const supportsMouseWheelZoomCtrlKey = true
	const supportsMouseWheelZoomMetaKey = true
	const supportsPinchToZoom = true

	if (pdfViewer.isInPresentationMode) { return }

	const deltaMode = evt.deltaMode
	let scaleFactor = Math.exp(-evt.deltaY / 100)
	const isBuiltInMac = false
	const isPinchToZoom = evt.ctrlKey && deltaMode === WheelEvent.DOM_DELTA_PIXEL && evt.deltaX === 0 && (Math.abs(scaleFactor - 1) < 0.05 || isBuiltInMac) && evt.deltaZ === 0
	const origin = [evt.clientX, evt.clientY] as [number, number]
	if (isPinchToZoom || evt.ctrlKey && supportsMouseWheelZoomCtrlKey || evt.metaKey && supportsMouseWheelZoomMetaKey) {
		evt.preventDefault()
		if (isPinchToZoom && supportsPinchToZoom) {
			scaleFactor = _accumulateFactor(pdfViewer.currentScale, scaleFactor)
			updateZoom(null, scaleFactor, origin)
		} else {
			const delta = normalizeWheelEventDirection(evt)
			let ticks = 0
			if (deltaMode === WheelEvent.DOM_DELTA_LINE || deltaMode === WheelEvent.DOM_DELTA_PAGE) {
				ticks = Math.abs(delta) >= 1 ? Math.sign(delta) : _accumulateTicks(delta)
			} else {
				const PIXELS_PER_LINE_SCALE = 30
				ticks = _accumulateTicks(delta / PIXELS_PER_LINE_SCALE)
			}
			updateZoom(ticks, null, origin)
		}
	}
}

function onWheel(event: WheelEvent) {
	container.focus()

	if (event.ctrlKey) {
		event.preventDefault()
		OriginalPdfJsOnWheel(event)
		$zoom = parseFloat(viewer._currentScaleValue)
	}
	else {
		event.preventDefault()
		container.scrollLeft += event.deltaX * +1 * (1 / $zoom) // horizontal pan
		container.scrollTop += event.deltaY * +1 * (1 / $zoom) // vertical pan
	}
}

function resetZoom(val: number | 'auto') {
	viewer.currentScaleValue = `${val}`
	$zoom = viewer.currentScale
}

function setZoom() {
	resetZoom(1)
}

function resetZoomEvent(ev: Event) {
	setZoom()
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
			resetZoom('auto')
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

	<div class="controls" // transition:fly={{ y: 100 }}
		style:bottom={`calc(1em + ${extraBottom}px)`}
	>
		<button class="zoomText" on:click={resetZoomEvent}>{Math.round($zoom * 100)}%</button>
		<input class="zoomSlider" type="range" min="{zoom.range.min}" max={zoom.range.max} step="0.1" bind:value={$zoom} on:change={setZoom}/>
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
