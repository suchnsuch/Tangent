<script lang="ts">
import { getContext } from 'svelte'
import { Workspace } from 'app/model'
import PdfViewState from 'app/model/nodeViewStates/PdfViewState'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'

import * as pdfjs from 'pdfjs-dist'
import * as pdfviewer from 'pdfjs-dist/web/pdf_viewer.mjs'
import { resizeObserver } from 'app/utils/resizeObserver'

const workspace = getContext('workspace') as Workspace
const {
	noteWidthMax: maxWidth,
} = workspace.settings

export let state: PdfViewState
export let editable: boolean = true

export let layout: 'fill' | 'auto' = 'fill'
export let extraTop: number = 0

let container: HTMLDivElement
let viewerElement: HTMLDivElement

let viewer: pdfviewer.PDFViewer = null

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

doPDF().catch(e => {
	console.error(e)
})

function onResize(resizeEntries: ResizeObserverEntry[]) {
	if (viewer) {
		viewer.firstPagePromise.then(() => {
			viewer.currentScaleValue = 'auto'
		})
	}
}

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

	<article use:resizeObserver={onResize}>
		<div class="container pdfViewer" bind:this={container}>
			<div bind:this={viewerElement}></div>
		</div>
	</article>
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

</style>
