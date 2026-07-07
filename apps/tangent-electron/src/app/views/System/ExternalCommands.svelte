<script lang="ts">
import { dndzone, type DndEvent } from 'svelte-dnd-action'
import type { Workspace } from 'app/model'

import { getContext } from 'svelte'
import ExternalCommand from 'common/settings/ExternalCommand'
import ExternalCommandEditor from '../external-commands/ExternalCommandEditor.svelte'
import ExternalCommandItem from '../external-commands/ExternalCommandItem.svelte'

const workspace = getContext('workspace') as Workspace
const settings = workspace.workspaceSettings
const commands = $settings.externalCommands
$: tempCommands = $commands

let currentCommand: ExternalCommand = null

function addCommand() {
	let command = new ExternalCommand()
	command.name.set('New Command')
	commands.add(command)
	currentCommand = command
}

async function deleteCommand() {
	const result = await workspace.api.system.messageDialog({
		title: 'Confirm Deletion',
		message: 'Are you sure you want to delete "' + currentCommand.name.value + '"?',
		buttons: ['Cancel', 'Delete']
	})

	if (result.response === 1) {
		commands.remove(currentCommand)
		currentCommand = null
	}
}

function handleDnDConsider(event: CustomEvent<DndEvent>) {
	tempCommands = event.detail.items as ExternalCommand[]
}

function handleDnDFinalize(event: CustomEvent<DndEvent>) {
	const newList: ExternalCommand[] = []
	for (const item of event.detail.items) {
		if (item === undefined) return

		const realItem = commands.value.find(i => i.id === item.id)
		if (realItem === undefined) return
		newList.push(realItem)
	}
	commands.set(newList)
}

</script>

<main>
	{#if currentCommand}
		<div class="container">
			<ExternalCommandEditor command={currentCommand}>
				<button slot="header-left" on:click={_ => currentCommand = null}>Done</button>
			</ExternalCommandEditor>

			<button class="delete" on:click={deleteCommand}>Delete</button>
		</div>
	{:else}
		<div class="container">
			<div use:dndzone={{
					items: tempCommands,
					dropTargetStyle: {},
					transformDraggedElement: element => {
						element.style.zIndex = '100000000000000' // TODO: Good lord. A more sensible z-index thing.
					}
				}}
				on:consider={handleDnDConsider}
				on:finalize={handleDnDFinalize}
			>
				{#each tempCommands as command (command.id)}
					<div><ExternalCommandItem command={command} on:click={ _ => currentCommand = command} /></div>
				{/each}
			</div>
			<button on:click={addCommand}>New Command</button>
		</div>
	{/if}
</main>

<style lang="scss">
.container {
	background-color: var(--noteBackgroundColor);
	padding: 1em;
	border-radius: var(--borderRadius);
}
</style>