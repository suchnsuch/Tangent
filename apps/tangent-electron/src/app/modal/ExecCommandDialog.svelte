<script lang="ts">
import { getContext } from 'svelte'
import type Workspace from '../model/Workspace'
import ModalInputSelect from './ModalInputSelect.svelte'
import type { TreeNode } from 'common/trees'
import type { NoteViewState } from 'app/model/nodeViewStates'
    import type { ExternalCommandRuleDefinition } from 'common/settings/ExternalCommand'

let workspace = getContext('workspace') as Workspace
let text: string = ''

// export let subject: TreeNode
// export let workspaceRoot: string
export let commands: ExternalCommandRuleDefinition[]

console.log(commands)

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
	const currentViewState = workspace.viewState.tangent.getCurrentViewState()
	const ctx = {
		'file': currentViewState.node.path, 
		'workspace': workspace.viewState.directoryView.root.path,
		'cursor': currentViewState.node.fileType == '.md' ? (currentViewState as NoteViewState).selection.value.join(',') : 'nan,nan',
		'thread': '...'
	}
	let cmd = option.commandTemplate.replace(/%([^%]*?)%/g, (match, expr) => ctx[expr])
	workspace.api.os.execCLI(cmd)
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
			{option.name}
		</svelte:fragment>
	</ModalInputSelect>
</main>
