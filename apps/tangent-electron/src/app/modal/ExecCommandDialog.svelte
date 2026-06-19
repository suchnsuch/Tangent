<script lang="ts">
import { getContext } from 'svelte'
import type Workspace from '../model/Workspace'
import ModalInputSelect from './ModalInputSelect.svelte'
    import type { TreeNode } from 'common/trees';

let workspace = getContext('workspace') as Workspace
let text: string = ''

type Script = {
	name: string
	file: string
	path: string
}

export let subject: TreeNode
export let workspaceRoot: string
export let scripts: Script[]

function filterScripts(c){
	return scripts.filter(s => s.name.includes(c))
}

// ---------------------------------------

let options = filterScripts("")
let selectedIndex = 0

$: updateOptions(text)
function updateOptions(text: string) {
	options = filterScripts(text)
}
function onAutocomplete(option: Script) {
	return undefined
}

function selectOption(option: Script, event) {
	const args = [
		'--file', workspace.viewState.tangent.getCurrentViewState().node.path, 
		'--workspace', workspace.viewState.directoryView.root.path,
	]
	workspace.api.os.execCLI('bash', [option.path, ...args])
	workspace.viewState.modal.close()
}

</script>

<main class="ModalContainer">
	<h1>Run ... </h1>
	<ModalInputSelect
		{options}
		placeholder="Type to filter scripts..."
		bind:selectedIndex
		bind:text
		{onAutocomplete}
		onSelect={selectOption}>
		<svelte:fragment slot="option" let:option>
			{option.name}
		</svelte:fragment>
	</ModalInputSelect>
</main>
