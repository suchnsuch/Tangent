<script lang="ts">
import MapNode, { MapStrength, mapStrengthClass } from 'common/tangentMap/MapNode'
import type MapConnection from 'common/tangentMap/MapConnection'
import { BezierCurve, BezierPoint } from 'common/geometry'

export let connection: MapConnection
export let isThread: boolean
export let threadIndex: number

$: from = connection.from.value
$: to = connection.to.value

let debug: string = null

function getPath(from: MapNode, to: MapNode) {

	const fromX = from.x + from.width
	const fromY = from.y + from.height * .5

	const toX = to.x
	const toY = to.y + to.height * .5

	const closestLimit = from.outgoing.reduce((x, c) => Math.min(c.to.value.x, x), 10000000) - fromX

	const halfX = (toX - fromX) * .5
	const halfY = (toY - fromY) * .5

	const curveCenterX = Math.min(halfX, closestLimit * .5)

	let start = new BezierPoint({
		x: fromX,
		y: fromY,
		relativeOut: {
			x: Math.max(curveCenterX * 2/3, 20),
			y: 0
		}
	})

	let mid = new BezierPoint({
		x: fromX + curveCenterX,
		y: fromY + halfY,
		worldIn: start.worldOut
	})

	let end = new BezierPoint({
		x: toX,
		y: toY,
		worldIn: mid.worldOut
	})

	let points = [start, mid, end]

	return BezierCurve.toSVGPathDefintion(points)
}

function className(isThread: boolean, index: number, strength: MapStrength) {
	let result = 'MapConnection ' + mapStrengthClass(strength)
	if (isThread) {
		result += ' thread'

		if (index === 0) {
			result += ' current-thread'
		}
		else {
			result += ' thread' + index
		}
	}
	return result
}

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<path class={className(isThread, threadIndex, connection.strength.value)}
	on:click
	on:pointerenter
	on:pointerleave
	on:pointerdown
	d={getPath(from, to)}
/>

{#if debug}
	<g>{@html debug}</g>
{/if}

<style lang="scss">
path {
	cursor: pointer;
	fill: none;
	stroke-width: 2;
	stroke: var(--deemphasizedTextColor);

	transition: stroke-width .3s, stroke .3s;

	&.strength-connected {
		opacity: .8;
	}
	
	&.strength-navigated {
		stroke-dasharray: 4 7;
		stroke-linecap: round;
		opacity: 1;
	}

	&.strength-connected.strength-navigated {
		opacity: 1;
		stroke-dasharray: none;
	}

	&.thread {
		stroke: currentColor;

		&.thread-1 {
			stroke: var(--accentLastThreadColor);
			stroke-width: 4;
		}

		&.thread-2 {
			stroke: var(--accentLastLastThreadColor);
			stroke-width: 3;
		}

		&.current-thread {
			stroke-width: 5;
			stroke: var(--accentBackgroundColor);
		}
	}
}

:global(.alt-pressed) path:hover {
	stroke: red;
}
</style>