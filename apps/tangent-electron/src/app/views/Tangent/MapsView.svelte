<script lang="ts">
import { getContext, onMount, setContext, tick } from 'svelte'
import { Point } from 'common/geometry'
import type { Tangent, Workspace } from 'app/model'
import { scrollTo, startDrag } from 'app/utils'
import MapView from './MapView.svelte'
import { fillDateFormat, friendlyWeekDay } from 'common/dates'
import command from 'app/model/commands/CommandAction'
import classStore from 'app/utils/ClassStoreAction'
import { fade } from 'svelte/transition'
import { cubicInOut } from 'svelte/easing'
import Session, { type UpdateThreadOptions } from 'common/dataTypes/Session'
import { addShortcutsToEvent } from 'typewriter-editor'

const workspace = getContext('workspace') as Workspace
const {
	mapZoomScrollMode,
	mapZoomSensitivity
} = workspace.settings

const {
	mergeWithPreviousSession,
	createNewSession,
	archivePreviousSessions,
	showPreviousSession
} = workspace.commands

export let tangent: Tangent

$: openSessions = tangent.openSessions
$: activeSession = tangent.activeSession
$: currentNode = tangent.currentNode

$: tangentInfo = tangent.tangentInfo
$: zoom = $tangentInfo.zoom

setContext('tangent', tangent)

let view: HTMLElement = null
let container: HTMLElement = null

$: view?.focus()

type DragState = 'off' | 'panning'
let dragState: DragState

let scrollZoomState: 'ignore-until-reset' | 'zoom-only' | 'zoom-or-focus' = 'ignore-until-reset'
let scrollZoomTimeout = null
updateZoomTimeout()

onMount(() => {
	if (view && $tangentInfo) {
		// Disable automatic scroll-to-current behavior so that the cache can be restored
		nextContainMode = null
		tick().then(() => {
			view.scrollLeft = $tangentInfo.scrollX.value
			view.scrollTop = $tangentInfo.scrollY.value
			
			ensureCurrentNodeIsContained('center')

			// Restore normal scroll-to-current
			nextContainMode = 'buffer'
		})
	}
	return () => {
		if (view && $tangentInfo) {
			$tangentInfo.scrollX.set(view.scrollLeft)
			$tangentInfo.scrollY.set(view.scrollTop)
		}
	}
})

$: $currentNode ? onCurrentNodeChange() : null

var nextContainMode: ContainMode = 'buffer'
var nextContainSpeed = 250
function onCurrentNodeChange() {
	if (!nextContainMode) return // Trust this will be reset
	tick().then(() => {
		ensureCurrentNodeIsContained(nextContainMode, nextContainSpeed)
		nextContainMode = 'buffer'
		nextContainSpeed = 250
	})
}

type Containment = 'in' | 'start' | 'end'
type ContainMode = 'buffer' | 'center' | 'center-hard'

function ensureCurrentNodeIsContained(mode: ContainMode = 'buffer', scrollTime = 0) {
	if (!container) return
	console.log('Containing with', mode)
	// Ensure that the current node is visible
	const element = container.querySelector('.active .MapNodeView.current')
	if (element) {
		const elementContainer = element.getBoundingClientRect()
		const viewContainer = view.getBoundingClientRect()
		console.log(viewContainer)
		const buffer = 100

		let containX: Containment = 'in'
		if (elementContainer.left - buffer < viewContainer.left) {
			containX = 'start'
		}
		else if (elementContainer.bottom + buffer > viewContainer.right) {
			containX = 'end'
		}

		let containY: Containment = 'in'
		if (elementContainer.top - buffer < viewContainer.top) {
			containY = 'start'
		}
		else if (elementContainer.bottom + buffer > viewContainer.bottom) {
			containY = 'end'
		}

		let scrollX: number = undefined
		let scrollY: number = undefined

		if (mode === 'buffer') {
			if (containX === 'start') {
				scrollX = elementContainer.left + view.scrollLeft - buffer
			}
			else if (containX === 'end') {
				scrollX = elementContainer.right + view.scrollLeft - viewContainer.width + buffer
			}

			if (containY === 'start') {
				scrollY = elementContainer.top + view.scrollTop - buffer
			}
			else if (containY === 'end') {
				scrollY = elementContainer.bottom + view.scrollTop - viewContainer.height + buffer
			}
		}
		else if (mode === 'center-hard' || (mode === 'center' && (containX !== 'in' || containY !== 'in'))) {
			scrollX = view.scrollLeft - (viewContainer.left + viewContainer.width * .5 - elementContainer.left - elementContainer.width * .5)
			scrollY = view.scrollTop - (viewContainer.top + viewContainer.height * .5 - elementContainer.top - elementContainer.height * .5)
		}
		
		if (scrollX !== undefined || scrollY !== undefined) {
			console.log({ scrollX, scrollY })
			setScroll(scrollX, scrollY, scrollTime)
		}
	}
}

function setScroll(scrollX?: number, scrollY?: number, scrollTime?: number) {
	if (scrollTime) {
		scrollTo({
			container: view,
			duration: scrollTime,
			x: scrollX,
			y: scrollY
		})
	}
	else {
		if (scrollX) {
			view.scrollLeft = scrollX
		}
		if (scrollY) {
			view.scrollTop = scrollY
		}
	}
}

function onWheel(event: WheelEvent) {
	if (event.defaultPrevented) return
	const zoomMode = $mapZoomScrollMode
	if (zoomMode === 'scroll-to-zoom' || event.ctrlKey) {
		// We want scrolling to zoom the map unless we're zoomed all the way in
		// and are trying to zoom in more.
		// We also don't want to start zooming immediately when coming in from focus
		// or changing focus when coming out of zooming.
		if (scrollZoomState !== 'ignore-until-reset') {
			const change = event.deltaY
			if (zoomMode !== 'scroll-to-zoom' && scrollZoomState === 'zoom-or-focus' && change < 0 && $zoom === 1) {
				scrollZoomState = 'ignore-until-reset'
			}
			else {
				scrollZoomState = 'zoom-only'

				// Take into account where the mouse is when zooming so that we can
				// scroll to/from the mouse position
				const oldScale = zoom.value
				const oldScrollTop = view.scrollTop
				const scrollHeight = view.scrollHeight
				const scrollWidth = view.scrollWidth
				const oldScrollLeft = view.scrollLeft

				zoom.applyWheelEvent(event, $mapZoomSensitivity)
				const newScale = zoom.value

				const mouseRelativeX = ((event.x + oldScrollLeft) - (scrollWidth * .5)) / scrollWidth
				const mouseRelativeY = ((event.y + oldScrollTop) - (scrollHeight * .5)) / scrollHeight

				const scaleDelta = newScale - oldScale

				const shiftTop = scrollHeight * scaleDelta * mouseRelativeY / oldScale
				const shiftLeft = scrollWidth * scaleDelta * mouseRelativeX / oldScale

				view.scrollTop = oldScrollTop + shiftTop
				view.scrollLeft = oldScrollLeft + shiftLeft

				event.preventDefault()
			}
		}

		updateZoomTimeout()
	}
}

function updateZoomTimeout() {
	if (scrollZoomTimeout) clearTimeout(scrollZoomTimeout)
	scrollZoomTimeout = setTimeout(() => {
		scrollZoomState = 'zoom-or-focus'
	}, 200)
}

function onFocus(event: FocusEvent) {
	if (event.target === view) {
		const map = view.querySelector('.MapView.active')
		if (map) {
			(map as HTMLElement).focus({ preventScroll: true })
		}
	}
}

function interpretKeyboardEvent(event: KeyboardEvent) {
	const shortcutEvent = addShortcutsToEvent(event)
	switch (shortcutEvent.modShortcut) {
		case 'f':
			ensureCurrentNodeIsContained('center-hard', 500)
			return true
	}
}

function onKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented) return
	if (interpretKeyboardEvent(event)) {
		event.preventDefault()
	}
}

function onPointerDown(event: PointerEvent) {
	if (!document.activeElement || !view?.contains(document.activeElement)) {
		// We always want to grab focus from elsewhere if a child is clicked
		view?.focus()
	}

	if (event.defaultPrevented) return

	let last = Point.make(event)
	dragState = 'panning'

	startDrag({
		move(event) {
			
			let diff = Point.subtract(event, last)

			view.scrollTop -= diff.y
			view.scrollLeft -= diff.x

			last = Point.make(event)
		},
		end() {
			dragState = 'off'
		}
	})
}

function updateMapThread(session: Session, options: UpdateThreadOptions) {
	tangent.updateThread(options)
	if (session !== activeSession.value) {
		nextContainMode = 'center-hard'
		nextContainSpeed = 500
	}
}

let archivePreview = -1
function onArchiveMouseOver(event: MouseEvent, index: number) {
	archivePreview = index
}
function onArchiveMouseOut(event: MouseEvent) {
	archivePreview = -1
}

let mergePreview = -1
function onMergeMouseOver(event: MouseEvent, index: number) {
	mergePreview = index
}
function onMergeMouseOut(event: MouseEvent) {
	mergePreview = -1
}

$: if ($openSessions) {
	// List has changed. Preview indices are no longer valid.
	mergePreview = -1
	archivePreview = -1
}

</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<main
	bind:this={view}
	class="MapsView"
	class:grab-pan={dragState === 'panning'}
	on:wheel={onWheel}
	on:focus={onFocus}
	on:keydown={onKeydown}
	on:pointerdown={onPointerDown}
	tabindex="0"
>
	<div
		bind:this={container}
		class="container"
		style:transform={`scale(${$zoom})`}
	>
		<div class="extraSpace" style:grid-row={1}></div>
		{#each $openSessions as session, index (session)}
			{@const range = session.getDateRange()}
			{@const date = range?.first ?? new Date()}
			{@const isActive = session === $activeSession || mergePreview - 1 === index}
			<div class={"menu buttonBar index" + index}
				style:grid-row={2 + index * 2}
			>
				<span class="spacer"></span>
				{#if index > 0}
					{#if isActive}
						<span class="mergeUpWrapper">
							<!-- svelte-ignore a11y-mouse-events-have-key-events -->
							<!-- svelte-ignore a11y_consider_explicit_label -->
							<button class="subtle"
								use:command={mergeWithPreviousSession}
								on:mouseover={e => onMergeMouseOver(e, index)}
								on:mouseout={onMergeMouseOut}
							></button>
							{#if mergePreview === index}
								<div class="mergeUp" transition:fade={{ duration: 400, easing: cubicInOut }}>
									<svg><use href="bigarrow.svg#up" /></svg>
								</div>
							{/if}
						</span>
					{/if}

					<!-- svelte-ignore a11y-mouse-events-have-key-events -->
					<!-- svelte-ignore a11y_consider_explicit_label -->
					<button class="subtle"
						use:command={{ command: archivePreviousSessions, context: { session }}}
						on:mouseover={e => onArchiveMouseOver(e, index)}
						on:mouseout={onArchiveMouseOut}
					></button>
				{:else if session.previousSession.value}
					<!-- svelte-ignore a11y_consider_explicit_label -->
					<button class="subtle" use:command={{ command: showPreviousSession, context: { session } }}>
					</button>
				{/if}
				<span class="spacer"></span>
			</div>
			<div class="map"
				class:archivePreview={archivePreview > index}
				class:mergeUpPreview={mergePreview === index}
				class:mergeInPreview={mergePreview - 1 === index}
			>
				<header style:grid-row={3 + index * 2} class:isActive>
					<h1>{friendlyWeekDay(date)}</h1>
					<div>{fillDateFormat('%Month% %Do%, %YYYY%', date)}</div>
				</header>
				<article style:grid-row={3 + index * 2}
					use:classStore={{ store: session.isEmpty, className: 'empty' }}
				>
					<MapView {session} {isActive} updateThread={o => updateMapThread(session, o)} />
				</article>
			</div>
		{/each}
		
		<div class="extraSpace" style:grid-row={2 + $openSessions.length * 2}>
			<div class="end-menu buttonBar">
				{#if !$activeSession.isEmpty}
					<!-- svelte-ignore a11y_consider_explicit_label -->
					<button class="subtle" use:command={createNewSession}>
					</button>
				{/if}
			</div>
		</div>
	</div>
</main>

<style lang="scss">
main {
	inset: 0;
	position: absolute;

	padding-top: var(--topBarHeight);
	background: var(--noteBackgroundColor);

	overflow: auto;

	container: mapsview / size;

	&.grab-pan {
		cursor: grabbing;
	}
}

.container {
	display: grid;
	grid-auto-rows: auto;
	grid-template-columns: max-content auto;
}

.menu {
	grid-column: 1 / 3;

	padding: 5em 0em;

	opacity: 0;
	transition: opacity .3s;

	column-gap: .5em;
	
	&:hover {
		opacity: 1;
	}

	&.index0 .spacer {
		visibility: hidden;
	}

	.spacer {
		position: relative;

		&:first-child {
			width: 16em;
			flex-grow: 0;
		}

		&::after {
			content: '';
			position: absolute;
			
			left: 0;
			right: 0;
			top: 50%;
			height: 2px;

			background-color: var(--borderColor);
			border-radius: 1px;
		}

		&:first-child::after {
			left: 4em;
		}
		&:last-child::after {
			right: 4em;
		}
	}

	button:not(:hover):not(:active) {
		background-color: var(--noteBackgroundColor);
	}
}

.mergeUpWrapper {

	position: relative;

	.mergeUp {
		position: absolute;
		z-index: -1;
		left: 50%;
		top: -66px;
		transform: translateX(-50%);
		--iconStroke: var(--borderColor);
		opacity: .5;
	}
}


.map {
	display: contents;
}

header {
	position: relative;
	z-index: 1;
	grid-column: 1;

	text-align: right;
	margin-left: 4em;
	margin-top: .95em; // Trying to align with the baseline of the top node text

	transition: opacity .3s;

	&:not(.isActive) {
		opacity: .8;
	}

	h1 {
		font-weight: 200;
		margin: 0;
	}

	div {
		color: var(--deemphasizedTextColor);
	}

	.archivePreview &, .mergeUpPreview & {
		opacity: .4;
	}

	.mergeInPreview & {
		opacity: 1;
	}
}

article {
	grid-column: 2;

	padding: 0 100px;

	transition: opacity .3s;

	.archivePreview &, .mergeUpPreview & {
		opacity: .4;
	}
}

.extraSpace {
	display: inline;
	grid-column: 1 / 3;
	height: 80cqh;

	&:first-child {
		height: 60cqh;
	}

	.end-menu {
		opacity: 0;
		transition: opacity .3s;

		justify-content: center;
	}

	&:hover .end-menu {
		opacity: 1;
	}
}
</style>
