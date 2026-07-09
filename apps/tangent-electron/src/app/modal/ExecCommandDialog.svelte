<script lang="ts">
import { getContext } from 'svelte'
import type Workspace from '../model/Workspace'
import ModalInputSelect from './ModalInputSelect.svelte'
import type { ExternalCommandDefinition } from 'common/settings/ExternalCommand'
import { runExternalCommand } from 'app/model/commands/ExecuteExternalCommand'
import { buildFuzzySegementMatcher } from 'common/search'

let workspace = getContext('workspace') as Workspace
let text: string = ''

export let commands: ExternalCommandDefinition[]
let options = []
let selectedIndex = 0

$: updateOptions(text)
function updateOptions(textQuery: string) {
	const searchMatcher = buildFuzzySegementMatcher(textQuery)
	options = commands.filter(command => command.name.match(searchMatcher))
}

function onAutocomplete(option: ExternalCommandDefinition) {
	return undefined
}

function selectOption(option: ExternalCommandDefinition, event) {
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
