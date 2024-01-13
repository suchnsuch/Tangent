<script lang="ts">
import { createEventDispatcher, getContext } from 'svelte'
import { fade } from 'svelte/transition'

import type { TreeNode } from 'common/trees'

import type { Tangent, Workspace } from 'app/model'
import type MapNode from 'common/tangentMap/MapNode'
import { mapStrengthClass } from 'common/tangentMap/MapNode'
import { clockTime, shortestDayDate } from 'common/dates'
import { iconForNode } from 'common/icons'

import PopUpButton from 'app/utils/PopUpButton.svelte'
import SVGIcon from '../smart-icons/SVGIcon.svelte'

import ScrollingItemList from 'app/utils/ScrollingItemList.svelte'
import NodeLine from '../summaries/NodeLine.svelte'

const dispatch = createEventDispatcher()
const tangent = getContext('tangent') as Tangent

export let mapNode: MapNode
export let current: boolean = false
export let threaded: boolean = false
export let showIcon: boolean = true

export let onPointerEnter: (event: PointerEvent) => void = null

let inMenuOpen = false
let outMenuOpen = false

let showDateTimeout = null
let showDate = false

$: strength = mapNode.strength

let container: HTMLElement
mapNode.requestDimensions = () => {
	if (!container) return null

	const rect = container.getBoundingClientRect()
	// Take into account zoom of the map so offsets can be consistent
	const zoom = tangent.tangentInfo.value?.zoom.value
	if (zoom) {
		rect.width /= zoom
		rect.height /= zoom
	}

	return rect
}
$: updateSize(container)
function updateSize(container: HTMLElement) {
	const rect = mapNode.requestDimensions()
	if (!rect) return
	mapNode.setDimensions(rect.width, rect.height)
	dispatch('nodeSizeUpdated')
}

function inLinkItemEvent(node: TreeNode, event: Event) {
	onLinkItemEvent(node, event, 'in')
}

function outLinkItemEvent(node: TreeNode, event: Event) {
	onLinkItemEvent(node, event, 'out')
}

function onLinkItemEvent(node: TreeNode, event: Event, direction: 'in' | 'out') {
	if (event.type === 'click'
		|| event.type === 'keydown' && (event as KeyboardEvent).key === 'Enter') {
		
		dispatch('add-link', {
			node,
			direction
		})
		inMenuOpen = false
		outMenuOpen = false
	}
}

function _onPointerEnter(event: PointerEvent) {
	if (onPointerEnter) onPointerEnter(event)

	showDateTimeout = setTimeout(() => {
		showDate = true
	}, 500)
}

function _onPointerLeave(event: PointerEvent) {
	clearTimeout(showDateTimeout)
	showDateTimeout = null
	showDate = false
}

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<article
	id={mapNode.domID()}
	bind:this={container}
	class={`MapNodeView ${mapStrengthClass($strength)}`}
	class:current
	class:threaded
	class:showIcon
	style:z-index={1 + mapNode.positionDetails.depth}
	style:transform={`translate(${mapNode.x}px, ${mapNode.y}px)`}
	on:click
	on:dblclick
	on:pointerdown
	on:pointerup
	on:pointerenter={_onPointerEnter}
	on:pointerleave={_onPointerLeave}
	on:contextmenu
>
<span class="name">
	{#if showIcon}<SVGIcon ref={iconForNode(mapNode?.node.value)} size="1em" />{/if}
	{mapNode.node.value?.name}
</span>

{#if mapNode.positionDetails.dateMode !== 'none' || showDate}
	<div
		class="date"
		class:hidden={mapNode.positionDetails.dateMode == 'none'}
		class:show={showDate}
		transition:fade={{ duration: 500 }}
	>
		{#if mapNode.positionDetails.dateMode !== 'time'}
			<span class="day">{shortestDayDate(mapNode.dateCreated)}</span>
		{/if}
		<span class="time">{clockTime(mapNode.dateCreated)}</span>
	</div>
{/if}

<PopUpButton
	buttonClass="in"
	placement="left-start"
	menuMode="low-profile"
	bind:showMenu={inMenuOpen}
	title="Add or connect an incoming link"
>
	<svelte:fragment slot="button">
		<SVGIcon size={20} ref="mapNode.svg#plus"/>
	</svelte:fragment>

	<ScrollingItemList
		items={mapNode?.getInLinks() ?? []}
		takeFocus={true}
		onItemEvent={inLinkItemEvent}
	>
		<svelte:fragment slot="item" let:item>
			<NodeLine node={item} />
		</svelte:fragment>
		<div slot="empty" class="empty">No Incoming Links</div>
	</ScrollingItemList>
</PopUpButton>
<PopUpButton
	buttonClass="out"
	placement="right-start"
	menuMode="low-profile"
	bind:showMenu={outMenuOpen}
	title="Add or connect an outgoing link"
>
	<svelte:fragment slot="button">
		<SVGIcon size={20} ref="mapNode.svg#plus"/>
	</svelte:fragment>

	<ScrollingItemList
		items={mapNode?.getOutLinks() ?? []}
		takeFocus={true}
		onItemEvent={outLinkItemEvent}
	>
		<svelte:fragment slot="item" let:item>
			<NodeLine node={item} relativeTo={mapNode?.node.value} />
		</svelte:fragment>
		<div slot="empty" class="empty">No Outgoing Links</div>
	</ScrollingItemList>
</PopUpButton>
</article>

<style lang="scss">
article {
	background: var(--backgroundColor);
	position: absolute;
	top: 0;
	left: 0;
	max-width: 20em;

	padding: .4em .9em;
	font-size: 110%;
	line-height: 1.2em;
	border-radius: var(--inputBorderRadius);

	border: 2px solid var(--backgroundColor);

	cursor: pointer;

	transition: background-color .2s, opacity .2s;

	&.strength-connected:not(.strength-navigated) {
		opacity: 66%;
		.name {
			font-size: 90%;
		}
	}

	&:hover {
		opacity: 100%;
	}

	&.threaded {
		border-color: var(--accentDeemphasizedBackgroundColor);
	}

	&.current {
		background-color: var(--accentDeemphasizedBackgroundColor);
	}

	&.showIcon {
		padding-left: .4em;
		padding-right: .6em;

		.name {
			display: flex;
			align-items: center;
			gap: .4em;
		}
	}
}

:global(.active) article {
	opacity: 1.0;
	&.threaded {
		border-color: var(--accentBackgroundColor);
	}

	&.current {
		background-color: var(--accentBackgroundColor);
	}
}

.empty {
	color: var(--deemphasizedTextColor);
	font-style: italic;
	padding: .5em 1em;
}

.date {
	position: absolute;
	z-index: 1;
	right: 100%;
	top: 0;
	bottom: 0;
	padding: .25em;
	margin-right: 1em;

	display: flex;
	flex-direction: column;
	justify-content: center;

	color: var(--deemphasizedTextColor);
	transition: color .2s, opacity .5s;

	&.hidden {
		opacity: 0;
	}
	&.show {
		opacity: 1;
	}

	:hover & {
		color: var(--textColor);
	}

	&::before {
		content: '';
		position: absolute;
		z-index: 0;
		inset: 0;
		background-color: var(--noteBackgroundColor);
		opacity: .9;
		border-radius: var(--inputBorderRadius);
	}

	span {
		white-space: nowrap;
		position: relative;
		z-index: 1;
		text-align: right;
	}

	.time {
		font-size: small;
	}
}

:global {
	.MapNodeView {
		button {
			position: absolute;
			border-radius: 24px; // This is a circle
			padding: 0;
			display: flex;

			opacity: 0;
			transition: opacity .3s;
		}

		&:hover button, button.open {
			opacity: 1;
		}

		button.in {
			left: 0;
			top: 50%;

			transform: translate(-66%, -50%);
		}

		button.out {
			right: 0;
			top: 50%;

			transform: translate(66%, -50%);
		}
	}
}


</style>
	