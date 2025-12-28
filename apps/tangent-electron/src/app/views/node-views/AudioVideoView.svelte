<script lang="ts">
import { getContext } from 'svelte'
import { Workspace } from 'app/model'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'
import AudioVideoViewState from 'app/model/nodeViewStates/AudioVideoViewState'
import { EmbedType } from 'common/embedding'

import 'media-chrome'
import 'media-chrome/menu'

const workspace = getContext('workspace') as Workspace
const {
	noteWidthMax: maxWidth,
} = workspace.settings

export let state: AudioVideoViewState
export let editable: boolean = true

export let layout: 'fill' | 'auto' = 'fill'
export let extraTop: number = 0

$: playbackPosition = state?.playbackPosition

$: embedType = state?.file?.embedType

function updatePlayback(this: HTMLAudioElement | HTMLVideoElement, event: Event) {
	playbackPosition.set(this.currentTime)
}

function setPlayback(this: HTMLAudioElement | HTMLVideoElement, event: Event) {
	this.currentTime = playbackPosition.value
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
	<article>
		<media-controller
			audio={embedType === EmbedType.Audio}
			class:audio={embedType === EmbedType.Audio}
		>
			{#if embedType === EmbedType.Audio}
				<audio
					slot="media"
					src={state.file.cacheBustPath}
					currenttime={$playbackPosition}

					on:loadedmetadata={setPlayback}
					on:seeked={updatePlayback}
					on:pause={updatePlayback}
				></audio>
			{:else if embedType === EmbedType.Video}
				<!-- svelte-ignore a11y-media-has-caption -->
				<video
					slot="media" preload="auto"
					src={state.file.cacheBustPath}
					currenttime={$playbackPosition}

					on:loadedmetadata={setPlayback}
					on:seeked={updatePlayback}
					on:pause={updatePlayback}
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
