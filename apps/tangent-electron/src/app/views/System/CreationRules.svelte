<script lang="ts">
import { dndzone, DndEvent } from 'svelte-dnd-action'
import type { Workspace } from 'app/model'

import CreationRule from 'common/settings/CreationRule'
import { getContext } from 'svelte';
import CreationRuleEditor from '../creation-rules/CreationRuleEditor.svelte'

import CreationRuleItem from '../creation-rules/CreationRuleItem.svelte'

const workspace = getContext('workspace') as Workspace
const settings = workspace.workspaceSettings
const rules = $settings.creationRules
$: tempRules = $rules

let currentRule: CreationRule = null

function addRule() {
	let rule = new CreationRule()
	rule.name.set('New Rule')
	rules.add(rule)
	currentRule = rule
}

async function deleteRule() {
	const result = await workspace.api.system.messageDialog({
		title: 'Confirm Deletion',
		message: 'Are you sure you want to delete "' + currentRule.name.value + '"?',
		buttons: ['Cancel', 'Delete']
	})

	if (result.response === 1) {
		rules.remove(currentRule)
		currentRule = null
	}
}

function handleDnDConsider(event: CustomEvent<DndEvent>) {
	tempRules = event.detail.items as CreationRule[]
}

function handleDnDFinalize(event: CustomEvent<DndEvent>) {
	const newList: CreationRule[] = []
	for (const item of event.detail.items) {
		if (item === undefined) return

		const realItem = rules.value.find(i => i.id === item.id)
		if (realItem === undefined) return
		newList.push(realItem)
	}
	rules.set(newList)
}

</script>

<main>
	{#if currentRule}
		<div class="container">
			<CreationRuleEditor rule={currentRule}>
				<button slot="header-left" on:click={_ => currentRule = null}>Done</button>
			</CreationRuleEditor>

			<button class="delete" on:click={deleteRule}>Delete</button>
		</div>
	{:else}
		<div class="container">
			<div use:dndzone={{
					items: tempRules,
					dropTargetStyle: {},
					transformDraggedElement: element => {
						element.style.zIndex = '100000000000000' // TODO: Good lord. A more sensible z-index thing.
					}
				}}
				on:consider={handleDnDConsider}
				on:finalize={handleDnDFinalize}
			>
				{#each tempRules as rule (rule.id)}
					<div><CreationRuleItem {rule} on:click={ _ => currentRule = rule} /></div>
				{/each}
			</div>
			<button on:click={addRule}>New Rule</button>
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