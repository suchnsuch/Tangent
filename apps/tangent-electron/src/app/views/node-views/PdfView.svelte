<script lang="ts">
import { getContext } from 'svelte'
import { Workspace } from 'app/model'
import PdfViewState from 'app/model/nodeViewStates/PdfViewState'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'

import * as pdfjs from 'pdfjs-dist'

const workspace = getContext('workspace') as Workspace
const {
	noteWidthMax: maxWidth,
} = workspace.settings

export let state: PdfViewState
export let editable: boolean = true

export let layout: 'fill' | 'auto' = 'fill'
export let extraTop: number = 0

let canvas: HTMLCanvasElement

async function doPDF() {
	let pdf = await pdfjs.getDocument(state.file.cacheBustPath).promise

	let page = await pdf.getPage(1)

	const viewport = page.getViewport({ scale: 1 })
	const outputScale = window.devicePixelRatio
	const canvasContext = canvas.getContext('2d')

	console.log({
		viewport,
		outputScale
	})

	canvas.width = viewport.width * outputScale
	canvas.height = viewport.height * outputScale
	
	page.render({
		canvas,
		canvasContext,
		viewport
	})
}

doPDF().catch(e => {
	console.error(e)
})

</script>

<main
	class:layout-fill={layout === 'fill'}
	style:--noteWidthMax={$maxWidth + 'px'}
	style:padding-top={extraTop + 'px'}
>
	<WorkspaceFileHeader
		node={state.file}
		{editable}
	/>

	<canvas bind:this={canvas} ></canvas>
</main>

<style lang="scss">
main {
	&.layout-fill {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
}
object, canvas {
	width: 100%;
	height: 100%;
}
</style>
