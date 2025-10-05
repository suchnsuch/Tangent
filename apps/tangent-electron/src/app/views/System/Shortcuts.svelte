<script lang="ts">
import { getContext } from 'svelte'
import { isMac } from 'common/platform'
import { buildFuzzySegementMatcher } from 'common/search'
import { Workspace } from 'app/model'
import { Command, WorkspaceCommands, WorkspaceCommand } from 'app/model/commands'
import { shortcutDisplayString } from 'app/utils/shortcuts'
import { tooltip } from 'app/utils/tooltips'
import ShortcutsEditorCommandTooltip from './ShortcutsEditorCommandTooltip.svelte'

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

type LabeledCommand = {
	key: string,
	command: WorkspaceCommand,
	label: string
}

let filter = ''
$: list = getKeyboardList(workspace.commands, $keymap, filter)
function getKeyboardList(commands: WorkspaceCommands, keymap: Map<string, string[]>, filter: string): LabeledCommand[] {
	let result = [] as LabeledCommand[]

	const matcher = filter ? buildMatcher(filter) : null

	for (const key of Object.keys(commands)) {
		const command = commands[key]
		if (doesCommandMatch(command, matcher)) {
			result.push({
				key,
				command,
				label: command.getName() ?? key
			})
		}
	}

	result.sort((a, b) => {
		if (a.label < b.label) {
			return -1
		}
		if (a.label > b.label) {
			return 1
		}
		return 0
	})

	return result
}

</script>

<main>
	<nav><label>Search: <input type="search" bind:value={filter} /></label></nav>
	<table>
		<tr>
			<th>Command</th>
			<th>Bindings</th>
		</tr>
		{#each list as item}
			<tr>
				<td class="label" use:tooltip={{
					tooltip: ShortcutsEditorCommandTooltip,
					args: item
				}}>
					{item.label}
				</td>
				<td>
					{#if item.command.shortcuts}
						{#each item.command.shortcuts as shortcut}
							<div>{shortcutDisplayString(shortcut)}</div>
						{/each}
					{/if}
				</td>
			</tr>
		{/each}
	</table>
</main>

<style lang="scss">
nav {
	margin-bottom: .5em;
}
</style>