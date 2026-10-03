<script lang="ts">
import { getContext } from 'svelte'
import { Workspace } from 'app/model'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'
import AudioVideoViewState from 'app/model/nodeViewStates/AudioVideoViewState'
import { EmbedType } from 'common/embedding'

import { appendContextTemplate, type ContextMenuConstructorOptions } from 'app/model/menus'
import { loadMediaChrome } from 'app/shim/media-chrome'

const workspace = getContext('workspace') as Workspace
const {
	noteWidthMax: maxWidth,
} = workspace.settings

let {
	state,
	editable = true,

	layout = 'fill',
	extraTop = 0,
	extraBottom = 0
} : {
	state: AudioVideoViewState
	editable: boolean

	layout: 'fill' | 'auto'
	extraTop: number
	extraBottom: number
} = $props()

// svelte-ignore non_reactive_update
let mediaElement: HTMLAudioElement | HTMLVideoElement = null

let playbackPosition = $derived(state?.playbackPosition)
let embedType = $derived(state?.file?.embedType)

function updatePlayback(this: HTMLAudioElement | HTMLVideoElement, event: Event) {
	playbackPosition.set(this.currentTime)
}

function setPlayback(this: HTMLAudioElement | HTMLVideoElement, event: Event) {
	this.currentTime = playbackPosition.value
}

function onMediaContext(event: MouseEvent) {
	if (!mediaElement) return

	const menu: ContextMenuConstructorOptions[] = []

	const currentTimeLinkText = '[['
		+ workspace.directoryStore.getPathToItem(state.node, {
			includeExtension: true,
			length: workspace.settings.linkAutocompleteForm.value
		})
		+ `#time=${mediaElement.currentTime}`
		+ ']]'

	menu.push({
		label: 'Copy Link at Current Time',
		toolTip: 'Adds a link to this file at the current timestamp',
		click: () => {
			navigator.clipboard.writeText(currentTimeLinkText)
		}
	})

	appendContextTemplate(event, menu)
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
	<article>
		{#await loadMediaChrome()}
			…
		{:then _} 
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<media-controller
				audio={embedType === EmbedType.Audio}
				class:audio={embedType === EmbedType.Audio}
				oncontextmenu={onMediaContext}
			>
				{#if embedType === EmbedType.Audio}
					<audio
						bind:this={mediaElement}
						slot="media"
						src={state.file.cacheBustPath}
						currenttime={$playbackPosition}

						onloadedmetadata={setPlayback}
						onseeked={updatePlayback}
						onpause={updatePlayback}
					></audio>
				{:else if embedType === EmbedType.Video}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						bind:this={mediaElement}
						slot="media" preload="auto"
						src={state.file.cacheBustPath}
						currenttime={$playbackPosition}

						onloadedmetadata={setPlayback}
						onseeked={updatePlayback}
						onpause={updatePlayback}
					></video>
				{/if}
				<media-settings-menu hidden anchor="auto">
					<media-settings-menu-item>
						Speed
						<media-playback-rate-menu slot="submenu" hidden>
							<div slot="title">Speed</div>
						</media-playback-rate-menu>
					</media-settings-menu-item>
				</media-settings-menu>
				<media-control-bar>
					<div class="simple-menu">
						<media-play-button class="first" notooltip></media-play-button>
						<div class="floating">
							<media-seek-backward-button style="min-width: 3em"></media-seek-backward-button>
							<media-seek-forward-button style="min-width: 3em"></media-seek-forward-button>
						</div>
					</div>
					<div class="simple-menu">
						<media-mute-button notooltip></media-mute-button>
						<div class="floating">
							<media-volume-range></media-volume-range>
						</div>
					</div>
					<media-time-display showduration notoggle></media-time-display>
					<media-time-range></media-time-range>
					<media-settings-menu-button></media-settings-menu-button>
					{#if embedType === EmbedType.Video}
						<media-fullscreen-button></media-fullscreen-button>
					{/if}
				</media-control-bar>
			</media-controller>
		{/await}
	</article>
</main>

<style lang="scss">
main {
	&.layout-fill {
		position: absolute;
		inset: 0;
		overflow: auto;
	}
}

article {
	max-width: var(--noteWidthMax);
	margin: 0 auto;
}

media-controller {
	display: block;

	&.audio {
		margin: 16vh 1em;
	}
}

</style>
