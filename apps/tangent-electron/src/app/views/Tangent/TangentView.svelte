<script lang="ts">	
import { getContext } from 'svelte'
import { fly } from 'svelte/transition'
	
import { clamp } from 'common/utils';
import type { Workspace, Tangent } from 'app/model'
import ThreadView from './ThreadView.svelte'
import type { TreeNode } from 'common/trees'
import type { NavigationData } from 'app/events';
import FocusLevelIcon from '../smart-icons/FocusLevelIcon.svelte';
import { derived } from 'svelte/store';
import { FocusLevel } from 'common/dataTypes/TangentInfo'
import MapsView from './MapsView.svelte';
import { SelfStore } from 'common/stores';

export let tangent: Tangent
$: focusLevel = tangent.focusLevel

const workspace = getContext('workspace') as Workspace

function createTitle(name: string) {
	let result = workspace.directoryStore.files.name + ' – Tangent'
	if (name) {
		result = name + ' – ' + result
	}
	return result
}

const title = derived(tangent.currentNode, (currentNode, set) => {
	if (currentNode && currentNode instanceof SelfStore) {
		return derived(currentNode, node => {
			return createTitle(node.name)
		}).subscribe(set)
	}
	else {
		set(createTitle(currentNode?.name))
	}
})

let zoomLevel = 0
let zoomReset = null

// TODO: This should be configurable as "focus zoom sensitivity"
let zoomInterval = 70

let focusMessageTimeout = null
function showFocusMessage() {
	if (focusMessageTimeout) {
		clearTimeout(focusMessageTimeout)
	}

	focusMessageTimeout = setTimeout(() => {
		focusMessageTimeout = null
	}, 1200)
}

function onWheel(event: WheelEvent) {
	if (event.defaultPrevented) return
	if (event.ctrlKey) {
		// Chromium reports trackpad zoom events like wheel events
		// with the ctrl key pressed
		
		if (zoomReset) {
			clearTimeout(zoomReset)
		}
		
		// Positive is pinch-in, negative is pinch-out
		const change = event.deltaY
		zoomLevel += change
		let focusChange = 0

		if (change > 0) {
			// Zooming out
			if (zoomLevel > zoomInterval) {
				focusChange--
			}
		}
		else {
			// Zooming in
			if (zoomLevel < -zoomInterval) {
				focusChange++
			}
		}

		showFocusMessage()

		if (focusChange !== 0) {
			zoomLevel = 0

			let targetNode = (event as any).treeNode as TreeNode
			if (targetNode) {
				tangent.updateThread({ currentNode: targetNode, thread: 'retain' })
			}

			// Use workspace command to invoke extra behavior
			const currentFocusLevel = workspace.viewState.tangent.focusLevel.value
			const nextFocusLevel = clamp(currentFocusLevel + focusChange, FocusLevel.Lowest, FocusLevel.Highest)
			if (currentFocusLevel !== nextFocusLevel) {
				workspace.commands.setFocusLevel.execute({
					targetFocusLevel: nextFocusLevel
				})
			}
		}

		zoomReset = setTimeout(() => {
			zoomLevel = 0
		}, 1200)
		
		event.preventDefault()
	}
}

$: onFocusLevel($focusLevel)
function onFocusLevel(f: FocusLevel) {
	if (f >= FocusLevel.File) {
		showFocusMessage()
	}
}

function onNavigate(event: CustomEvent<NavigationData>) {
	workspace.navigateTo(event.detail)
}
</script>


<svelte:head>
	<title>{$title}</title>
</svelte:head>

<main class="TangentView" on:wheel={onWheel}>
{#if $focusLevel >= FocusLevel.Thread}
	<ThreadView {tangent}
		on:navigate={onNavigate}/>
{:else}
	<MapsView {tangent} />
{/if}

{#if focusMessageTimeout}
	<div class="focusMessageContainer"
		in:fly|global={{ y: -300, duration: 300 }}
		out:fly|global={{ y: -300, duration: 600 }}
	>
		<div class="focusMessage">
			<div class="icons">
				{#each FocusLevel.allFocusLevels as fl}
					{#if fl > FocusLevel.Lowest}
						<progress
							class="lower"
							class:expanded={$focusLevel === fl}
							max={zoomInterval}
							value={$focusLevel === fl && zoomLevel > 0 ? zoomLevel : 0}
						></progress>
					{/if}
					<div
						class="icon"
						class:selected={$focusLevel==fl}
					>
						<FocusLevelIcon focusLevel={fl} />
					</div>
					{#if fl < FocusLevel.Highest}
						<progress
							class="higher"
							class:expanded={$focusLevel === fl}
							max={zoomInterval}
							value={$focusLevel === fl && zoomLevel < 0 ? -zoomLevel : 0}
						></progress>
					{/if}
				{/each}
			</div>
			<div class="message">{FocusLevel.getFullName($focusLevel)}</div>
			<div class="background"></div>
		</div>
	</div>
{/if}
</main>

<style lang="scss">
main {
	position: absolute;
	inset: 0;
	overflow: hidden;
}

.focusMessageContainer {
	position: fixed;
	left: 0;
	right: 0;

	top: 100px;
	text-align: center;
	pointer-events: none;
}

.focusMessage {
	position: relative;
	display: inline-block;
	padding: 1.5em;

	.icons {
		position: relative;
		z-index: 1;

		display: flex;
		align-items: center;

		font-size: 120%;
	}

	.icon {
		width: 2em;
		height: 2em;
		border-radius: 3em;

		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;

		&.selected {
			background: var(--accentBackgroundColor);
		}
	}

	progress {
		height: .2em;
		width: 0;
		background: var(--backgroundColor);
		transition: width .5s;

		&::-webkit-progress-bar {
			background: var(--backgroundColor);
		}
		&::-webkit-progress-value {
			background: var(--accentBackgroundColor);
		}

		&.lower {
			direction: rtl;
			&::-webkit-progress-bar, &::-webkit-progress-value {
				border-top-left-radius: .1em;
				border-bottom-left-radius: .1em;
			}
		}
		&.higher {
			&::-webkit-progress-bar, &::-webkit-progress-value {
				border-top-right-radius: .1em;
				border-bottom-right-radius: .1em;
			}
		}

		&.expanded {
			width: 3em;
		}
	}

	.message {
		position: relative;
		z-index: 1;
		margin-top: 1em;
	}

	.background {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;

		opacity: .8;
		background-color: var(--noteBackgroundColor);
		border-radius: var(--borderRadius);
	}
}
</style>
