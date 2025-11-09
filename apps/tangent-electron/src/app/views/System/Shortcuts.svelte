<script lang="ts">
import { getContext } from 'svelte'
import { deepEqual } from 'fast-equals'
import { isMac } from 'common/platform'
import { buildFuzzySegementMatcher } from 'common/search'
import { Workspace } from 'app/model'
import { WorkspaceCommands, WorkspaceCommand } from 'app/model/commands'
import { shortcutDisplayString } from 'app/utils/shortcuts'
import { tooltip } from 'app/utils/tooltips'
import ShortcutsEditorCommandTooltip from './ShortcutsEditorCommandTooltip.svelte'
import SVGIcon from '../smart-icons/SVGIcon.svelte'
import ShortcutInput from 'app/utils/ShortcutInput.svelte'

const workspace = getContext('workspace') as Workspace
const keymap = workspace.settings.keymap

function buildMatcher(filter: string) {
	filter = filter.replace(/command/i, 'Mod')
	filter = filter.replace(/control/i, 'Ctrl')
	
	if (isMac) {
		filter = filter.replace(/Option/, 'Alt')
	}
	else {
		filter = filter.replace(/Ctrl/, 'Mod')
	}

	return buildFuzzySegementMatcher(filter)
}

function doesCommandMatch(command: WorkspaceCommand, matcher: RegExp) {
	if (!matcher) return true
	const label = command.getName()
	if (typeof label === 'string' && label.match(matcher)) {
		return true
	}
	if (command.shortcuts) {
		for (const shortcut of command.shortcuts) {
			if (shortcut.match(matcher)) {
				return true
			}
		}
	}
	return false
}

type CommandGroup = {
	title: string
	commands: LabeledCommand[]
}

type LabeledCommand = {
	key: string,
	command: WorkspaceCommand,
	label: string
}

let filter = ''
$: list = getKeyboardList(workspace.commands, $keymap, filter)
function getKeyboardList(commands: WorkspaceCommands, keymap: Map<string, string[]>, filter: string): CommandGroup[] {
	let groups = new Map<string, CommandGroup>()

	const matcher = filter ? buildMatcher(filter) : null

	for (const key of Object.keys(commands)) {
		const command = commands[key]
		if (doesCommandMatch(command, matcher)) {

			let group = groups.get(command.group)
			if (!group) {
				group = {
					title: command.group || 'Global',
					commands: []
				}
				groups.set(command.group, group)
			}

			group.commands.push({
				key,
				command,
				label: command.getName() ?? key
			})
		}
	}

	let result = [...groups.values()].sort((a, b) => {
		if (a.title < b.title) {
			return -1
		}
		if (a.title > b.title) {
			return 1
		}
		return 0
	})

	for (const group of result) {
		group.commands.sort((a, b) => {
			if (a.label < b.label) {
				return -1
			}
			if (a.label > b.label) {
				return 1
			}
			return 0
		})
	}

	return result
}

// Fallback for when commands have no shortcuts
const emptyShortcuts = [] as string[]

type EditTarget = {
	key: string
	index: number
}
let editTarget: EditTarget = null

function startEditing(item: LabeledCommand, index: number) {
	editTarget = {
		key: item.key,
		index
	}
}

function stopEditing() {
	editTarget = null
}

function validate(shortcut: string) {
	const targetCommand = workspace.commands[editTarget.key]

	for (const key of Object.keys(workspace.commands)) {
		const command = workspace.commands[key]
		if (command === targetCommand) continue
		if (command.shortcuts && (!command.group || targetCommand.group.startsWith(command.group))) {
			for (const sc of command.shortcuts) {
				if (sc == shortcut) {
					return 'This shortcut is used by "' + command.getName() + '"'
				}
			}
		}
	}
	return null
}

function acceptEdit(shortcut: string) {
	let currentShortcuts = keymap.get(editTarget.key)?.slice() ?? workspace.commands[editTarget.key]?.shortcuts?.slice() ?? []

	if (currentShortcuts.length > editTarget.index) currentShortcuts[editTarget.index] = shortcut
	else currentShortcuts.push(shortcut)
	
	keymap.set(editTarget.key, currentShortcuts)
	stopEditing()
}

function removeBinding(item: LabeledCommand, index: number) {
	let bindings = item.command.shortcuts.slice()
	bindings.splice(index, 1)
	keymap.set(item.key, bindings)
}

function resetToDefault(key: string) {
	keymap.delete(key)
	editTarget = null
}

</script>

<main>
	<nav><input type="search" bind:value={filter} placeholder="Search" /></nav>
	<table>
		{#each list as group (group.title)}
			<tr>
				<th>{group.title} Commands</th>
				<th>Bindings</th>
				<th></th>
			</tr>
			{#each group.commands as item (item.command)}
				{@const shortcuts = item.command.shortcuts ?? emptyShortcuts}
				<tr>
					<td class="label" use:tooltip={{
						tooltip: ShortcutsEditorCommandTooltip,
						args: item
					}}>
						{item.label}
					</td>
					<td>
						{#each shortcuts as shortcut, index}
							{#if editTarget && editTarget.key === item.key && editTarget.index === index}
								<div>
									<ShortcutInput
										{validate}
										onCancel={stopEditing}
										onAccept={acceptEdit}
									/>
								</div>
							{:else}
								<div class="bindingRow">
									<button
										on:click={() => startEditing(item, index) }
										use:tooltip={"Click to set binding"}
									>
										{shortcutDisplayString(shortcut)}
									</button>
									<button class="action remove subtle"
										on:click={() => removeBinding(item, index)}
										use:tooltip={"Remove this binding"}
									>
										<SVGIcon size={16} ref="close.svg#close" />
									</button>
									{#if index === shortcuts.length - 1}
										<button class="action add subtle"
											on:click={() => startEditing(item, index + 1)}
											use:tooltip={"Add a new binding"}
										>
											<SVGIcon size={16} ref="plus.svg#plus" />
										</button>
									{/if}
								</div>
							{/if}
						{/each}
						{#if editTarget && editTarget.key === item.key && editTarget.index === shortcuts.length}
							<div>
								<ShortcutInput
									{validate}
									onCancel={stopEditing}
									onAccept={acceptEdit}
								/>
							</div>
						{:else if shortcuts.length === 0}
							<div class="bindingRow">
								<button class="action add subtle"
									on:click={() => startEditing(item, 0)}
									use:tooltip={"Add a new binding"}
								>
									<SVGIcon size={16} ref="plus.svg#plus" />
								</button>
							</div>
						{/if}
					</td>
					<td>
						<button class="subtle"
							class:hidden={deepEqual(item.command.shortcuts, item.command.defaultShortcuts)}
							on:click={() => resetToDefault(item.key)}
							use:tooltip={"Reset to default bindings"}
						>
							<SVGIcon size={16} ref="reset.svg#arc" />
						</button>
					</td>
				</tr>
			{/each}
		{/each}
	</table>
</main>

<style lang="scss">
nav {
	margin-bottom: .5em;
}
.hidden {
	visibility: hidden;
}

th {
	padding-top: 1em;
}

.label {
	line-height: 1.5em;
	min-width: 200px;
}

.bindingRow {
	display: flex;
	gap: .25em;
	white-space: nowrap;

	.action {
		visibility: hidden;
		display: flex;
		align-content: center;
	}
	&:hover .action {
		visibility: visible;
	}
}
</style>