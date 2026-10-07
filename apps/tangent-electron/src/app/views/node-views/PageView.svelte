<script lang="ts">
import { getContext } from "svelte"
import type { NavigationData } from "app/events"
import type { Workspace } from "app/model"
import type PageViewState from "app/model/nodeViewStates/PageViewState"
import type { CreateNewFileCommandContext } from "app/model/commands/CreateNewFile"
import SVGIcon from "../smart-icons/SVGIcon.svelte"
import type { NodeViewProps } from "./nodeView"
import NoteEditor from "../editors/NoteEditor/NoteEditor.svelte"
    import { tooltip } from "app/utils/tooltips";
    import arrowNavigate from "app/utils/arrowNavigate";

const workspace = getContext('workspace') as Workspace

let {
	state,

	layout = 'fill',
	background = 'auto',
	focusLevel,

	extraTop = 0,
	extraBottom = 0,

	onNavigate,
	onViewReady,
	onScrollRequest,
	onKeyboardExit
} : NodeViewProps & {
	state: PageViewState
} = $props()

let path = $derived(state.settings.pagePath)
let noteViewState = $derived(state.noteViewState)

function forwardNavigation(data: NavigationData) {
	if (!onNavigate) return

	if (data.direction === 'out') {
		// Ensure this navigation is retained
		onNavigate({
			target: $noteViewState.note,
			direction: 'out',
			origin: state.parent.node
		})

		// Pass on the event
		onNavigate({ ...data })
	}
	else if (data.direction === 'in') {
		// Replace origin with self so that set lens is maintained
		onNavigate({
			...data,
			origin: state.parent.node
		})
	}
	else if (data.direction === 'replace') {
		// Pass on the normal event
		onNavigate({
			...data
		})
	}
}

function createTarget(name: string) {
	const createNewFile = workspace.commands.createNewFile

	const context: CreateNewFileCommandContext = {
		folder: state.parent.node,
		name,
		updateSelection: false,
		creationMode: 'createOrOpenCaseInsensitive'
	}

	if (!createNewFile.canExecute(context)) return

	const newNote = createNewFile.execute(context)
}

</script>

{#if noteViewState && $noteViewState}
	<NoteEditor state={$noteViewState}
		{layout} {background} {focusLevel} {extraTop} {extraBottom}
		onNavigate={forwardNavigation}
		{onViewReady} {onScrollRequest} {onKeyboardExit}
	/>
{:else}
	<main class={{ fill: layout === 'fill' }}
		style:padding-top={extraTop + 'px'}
		style:padding-bottom={extraBottom + 'px'}
	>
		<article class="message">
			<p><SVGIcon
				ref="tangent-icon-nocolor.svg#icon"
				size="256"
				styleString="--iconStroke: var(--embossedBackgroundColor);"
			/></p>
			{#if $path}
				<p>The relative path <code>"{$path}"</code> could not be resolved to a note.</p>
			{/if}
			<p>
				The Page Lens presents a note in place of this Set.
				It is best used in situations where you want to see a landing page or index for some grouping of information.
			</p>
			<p>Please select a note in the lens settings above to display it, or create one:</p>
			{#if !$path && state.parent.node.fileType === 'folder'}
				<div class="buttons"
					use:arrowNavigate={{
						targetSelector: 'button'
					}}
				>
					<button
						onclick={e => createTarget(state.parent.node.name)}
						use:tooltip={'Using the same name for the note as the folder provides a very readable experience.'}
					>Create and Show "{state.parent.node.name}.md"</button>

					<button
						onclick={e => createTarget('index')}
						use:tooltip={'An "index.md" file is a common default for Maps of Content within folders.'}
					>Create and Show "index.md"</button>
				</div>
			{/if}
		</article>
	</main>
{/if}

<style lang="scss">
main {
	position: relative;
	&.fill {
		position: absolute;
		inset: 0;
	}
}

.message {
	text-align: center;
	padding-top: 20vh;

	max-width: 24em;
	margin: 0 auto;

	p {
		color: var(--deemphasizedTextColor);
	}
}

code {
	color: var(--accentTextColor);
}

.buttons {
	display: flex;
	flex-direction: column;
	gap: .25em;
}
</style>
