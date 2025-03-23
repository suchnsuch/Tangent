<script lang="ts">
import { focusLayer } from 'app/utils';
import { getContext } from 'svelte'
import type { CreateNewFileCommandContext } from '../model/commands/CreateNewFile'
import type Workspace from '../model/Workspace'

export let title: string = 'Create New File'
export let preName: string
export let postName: string

export let context: CreateNewFileCommandContext

export let modalExitMode: 'close' | 'pop' = 'close'

let nameText: string

let workspace = getContext('workspace') as Workspace

let nameElement: HTMLElement
$: nameElement?.focus()

function onMainKeyDown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		event.preventDefault()

		if (nameText) {
			create()
		}
	}
}

function create() {
	workspace.commands.createNewFile.execute({
		...context,
		name: preName + nameText + postName
	})

	exit()
}

function exit() {
	workspace.viewState.modal[modalExitMode]()
}

function onNameInput() {
	nameText = nameElement.innerText
}

</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<main
	class="ModalContainer"
	on:keydown={onMainKeyDown}
	use:focusLayer={'CreateFileDialog'}
>
	<h1>{title}</h1>
	<div class="values">
		<div>
			<div class="label">Named:</div>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div class="name" on:click={e => nameElement.focus()}>
				<span>{preName}</span>
				<span
					class="writable"
					contenteditable
					bind:this={nameElement}
					on:input={onNameInput}></span>
				{#if !nameText}
					<span class="placeholder">Type New Note Name</span>
				{/if}
				<span>{postName}</span>
			</div>
		</div>
	</div>
	<div class="buttons">
		<button on:click={create} disabled={!nameText}>Create</button>
		<button on:click={exit}>Cancel</button>
	</div>
</main>

<style lang="scss">

.values {
	display: table;

	> div {
		display: table-row;

		> div {
			display: table-cell;
		}
	}
}

.label {
	padding-right: 1rem;
}

.placeholder {
	color: var(--deemphasizedTextColor);
	pointer-events: none;
}

.writable {
	outline: none;
}

.buttons {
	margin-top: 2rem;
	text-align: right;
}
</style>
