<script lang="ts">
import { getContext } from 'svelte'
import { Workspace } from 'app/model'
import WorkspaceFileHeader from 'app/utils/WorkspaceFileHeader.svelte'
import AudioVideoViewState from 'app/model/nodeViewStates/AudioVideoViewState'
import { EmbedType } from 'common/embedding'

const workspace = getContext('workspace') as Workspace
const {
	noteWidthMax: maxWidth,
} = workspace.settings

export let state: AudioVideoViewState
export let editable: boolean = true

export let layout: 'fill' | 'auto' = 'fill'
export let extraTop: number = 0

$: embedType = state?.file?.embedType

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
		{#if embedType == EmbedType.Audio}
			<audio
				controls
				src={state.file.cacheBustPath}
			/>
		{:else if embedType == EmbedType.Video}
			<!-- svelte-ignore a11y-media-has-caption -->
			<video
				controls preload="auto"
				src={state.file.cacheBustPath}
			/>
		{/if}
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

audio, video {
	width: 100%;
}

audio {
	margin-top: 16vh;
}
</style>
