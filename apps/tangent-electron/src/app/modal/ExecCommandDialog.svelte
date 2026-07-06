<script lang="ts">
import { getContext } from 'svelte'
import type Workspace from '../model/Workspace'
import ModalInputSelect from './ModalInputSelect.svelte'
import type { NoteViewState } from 'app/model/nodeViewStates'
import type { ExternalCommandRuleDefinition } from 'common/settings/ExternalCommand'
    import { ShellEscape } from 'app/utils/shell';
    import { runExternalCommand } from 'app/model/commands/ExecCliCommand';

let workspace = getContext('workspace') as Workspace
let text: string = ''

export let commands: ExternalCommandRuleDefinition[]

function filterScripts(c){
	return commands.filter(s => s.name.includes(c))
}

// ---------------------------------------

let options = filterScripts("")
let selectedIndex = 0

$: updateOptions(text)
function updateOptions(text: string) {
	options = filterScripts(text)
}
function onAutocomplete(option: ExternalCommandRuleDefinition) {
	return undefined
}

function selectOption(option: ExternalCommandRuleDefinition, event) {
	runExternalCommand(workspace, option)
	workspace.viewState.modal.close()
}

</script>

<main class="ModalContainer">
	<h1>Run ... </h1>
	<ModalInputSelect
		{options}
		placeholder="Type to filter commands..."
		bind:selectedIndex
		bind:text
		{onAutocomplete}
		onSelect={selectOption}>
		<svelte:fragment slot="option" let:option>
			<span>
				{option.name}
			</span>
			<span style="opacity: 0.5;">
				{option.description}
			</span>
		</svelte:fragment>
	</ModalInputSelect>
</main>
