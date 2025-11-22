<script lang="ts">
import { onMount } from 'svelte'
import * as pdfjs from 'pdfjs-dist'
import { resizeObserver } from 'app/utils/resizeObserver'

export let path: string

let container: HTMLElement
let canvas: HTMLCanvasElement

async function getFirstPage() {
	let pdf = await pdfjs.getDocument(path).promise
	return pdf.getPage(1)
}

let pagePromise = getFirstPage()
let pageRender: pdfjs.RenderTask = null
let dirtyTimeout: any = null
let isPendingPromise = false
let lastScale = 0

onMount(() => {
	debouncedRenderPage(0)
})

function onResize(resizeEntries: ResizeObserverEntry[]) {
	debouncedRenderPage()
}

function debouncedRenderPage(time=200) {
	if (dirtyTimeout) {
		clearTimeout(dirtyTimeout)
	}
	if (pageRender && !isPendingPromise) {
		isPendingPromise = true
		pageRender.promise.then(() => {
			pageRender = null
			dirtyTimeout = setTimeout(() => {
				dirtyTimeout = null
				isPendingPromise = false
				renderPage()
			}, time)
		})
	}
	else {
		dirtyTimeout = setTimeout(() => {
			dirtyTimeout = null
			renderPage()
		}, time)
	}
}

function renderPage() {
	const rect = container.getBoundingClientRect()

	pagePromise.then(page => {
		const unitViewport = page.getViewport({ scale: 1 })

		const scale = rect.width / unitViewport.width
		// Don't re-render if the scale is very similar
		if (lastScale !== 0 && Math.abs(scale - lastScale) < 0.1) return

		const viewport = page.getViewport({ scale })
		const outputScale = window.devicePixelRatio
		const canvasContext = canvas.getContext('2d')

		canvas.width = viewport.width * outputScale
		canvas.height = viewport.height * outputScale

		const transform = outputScale !== 1 
			? [outputScale, 0, 0, outputScale, 0, 0]
			: null

		pageRender = page.render({
			canvas,
			canvasContext,
			transform,
			viewport
		})
	})
}

</script>

<div bind:this={container} use:resizeObserver={onResize}>
	<canvas bind:this={canvas} />
</div>

<style lang="scss">
div {
	position: absolute;
	inset: 0;
	overflow: hidden;
}

canvas {
	width: 100%;
}
</style>
