<script lang="ts" module>
export function shouldShowCreationRulesFromHover(event: MouseEvent, container: HTMLElement) {
	if (!container) return false
	const height = container.getBoundingClientRect().height
	return event.y > height - 115
}
</script>

<script lang="ts">
import { getContext } from "svelte"
import { fly } from "svelte/transition"
import type { Workspace } from "app/model"
import SetCreationRules from "./SetCreationRules.svelte"
import type { SetViewState } from "app/model/nodeViewStates/SetViewState"

const workspace = getContext('workspace') as Workspace
const maxWidth = workspace.settings.noteWidthMax

interface Props {
	canShow: boolean
	state: SetViewState
	willCreateNewFiles?: boolean
}

let {
	canShow,
	state: setViewState,
	willCreateNewFiles = $bindable(false)
}: Props = $props()

</script>

{#if canShow}
	<div class="createContainer" transition:fly={{ y: 200 }} class:hidden={!willCreateNewFiles}>
		<div class="create" style:max-width={`${$maxWidth}px`}>
			<SetCreationRules state={setViewState} max={3} direction="row" bind:willCreateNewFiles />
		</div>
	</div>
{/if}

<style lang="scss">
.createContainer {
	position: absolute;
	bottom: 4em;
	left: 0;
	right: 0;

	z-index: 50;

	&.hidden {
		bottom: -200px;
	}
}

.create {
	display: flex;
	justify-content: stretch;
	margin: 0 auto;

	border-radius: var(--inputBorderRadius);

	background: var(--backgroundColor);
	color: var(--deemphasizedTextColor);

	transition: opacity .3s;

	:global(.focusing) & {
		opacity: 0.5;
	}

	box-shadow: 0 0 30px rgba(0, 0, 0, .3);
}
</style>
