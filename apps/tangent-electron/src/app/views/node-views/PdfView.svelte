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
			viewer.currentScaleValue = 'auto'
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
