<script lang="ts">
import { getContext } from 'svelte'
import type { Workspace } from 'app/model'

import type NodeSet from 'common/NodeSet'
import PopUpButton from 'app/utils/PopUpButton.svelte'
import type CreationRule from 'common/settings/CreationRule'
import type { CreationRuleDefinition } from 'common/settings/CreationRule'
import CommandAction from 'app/model/commands/CommandAction'
import CreationRuleName from '../summaries/CreationRuleName.svelte'

const workspace = getContext('workspace') as Workspace

export let state: NodeSet
export let _class = ''
export let max = 4
export let direction: 'column' | 'row' = 'column'

// This is to expose the value
export let willCreateNewFiles = true

$: rules = state.creationRules
$: shortList = $rules.slice(0, max)

// This works for any node that is a NodeSet, e.g. a Folder
$: navigateFrom = (state as any).node

$: isSingle = shortList.length === 1

$: commandParams = isSingle ? {
	command: workspace.commands.createNewFile,
	context: { rule: shortList[0], navigateFrom },
	preventDefault: true
} : null

$: willCreateNewFiles = determineWillCreateNewFiles($rules)
function determineWillCreateNewFiles(rules: (CreationRule | CreationRuleDefinition)[]) {
	for (const rule of rules) {
		if (!workspace.commands.createNewFile.willOpenExistingFile(rule)) {
			return true
		}
	}
	return false
}

</script>

{#if willCreateNewFiles}
<button
	class={"SetCreationRules " + _class + ' ' + direction}
	class:single={isSingle}
	class:multiple={!isSingle}
	use:CommandAction={commandParams}
	style:flex-direction={direction}
>
	<span class="label">Create</span>
	{#each shortList as rule}
		<button
			class="no-callout"
			use:CommandAction={isSingle ? null : {
				command: workspace.commands.createNewFile,
				context: {
					rule,
					navigateFrom
				},
				preventDefault: true,
				tooltipShortcut: false
			}}
		><CreationRuleName {rule}/></button>
	{/each}
	
	{#if shortList.length < $rules.length}
		<PopUpButton name="…" buttonClass="opener no-callout" menuMode="low-profile">
			<div class="popup buttonGroup vertical">
				{#each $rules as rule}
					<button
						class="no-callout"
						use:CommandAction={{
							command: workspace.commands.createNewFile,
							context: {
								rule,
								navigateFrom
							},
							preventDefault: true,
							tooltipShortcut: false
						}}
					><CreationRuleName {rule}/></button>
				{/each}
			</div>
		</PopUpButton>
	{/if}
</button>
{/if}

<style lang="scss">
// Going global & old school because it's easier
.SetCreationRules {
	background: transparent;
	padding: 0;

	display: flex;
	flex-grow: 1;
	flex-wrap: wrap;
	justify-content: center;
	align-items: stretch;

	.label {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	button {
		display: flex;
		align-items: center;
		justify-content: center;
		&:hover {
			color: var(--textColor);
		}
	}

	&.single {
		button {
			background: transparent;
		}
		&:hover {
			background: var(--accentBackgroundColor);
			color: var(--textColor);
		}
		&:active {
			background: var(--accentActiveBackgroundColor);
			color: var(--textColor);
		}
		&:hover, &:active {
			button {
				color: var(--textColor);
			}
		}
	}
	&.multiple {
		cursor: default;
		align-items: stretch !important;
		justify-content: stretch;

		.label {
			flex-grow: 1;
			
		}
		button {
			flex-grow: 1;
		}
	}

	:global {
		.opener {
			text-align: center;
			justify-content: center;
		}
	}

	&.row {
		:global {
			button {
				border-radius: 0;
				&:last-of-type {
					border-top-right-radius: var(--inputBorderRadius);
					border-bottom-right-radius: var(--inputBorderRadius);
				}
			}
		}
	}
	&.column {
		:global {
			button {
				border-radius: 0;
				&:last-of-type {
					border-bottom-right-radius: var(--inputBorderRadius);
					border-bottom-left-radius: var(--inputBorderRadius);
				}
			}
		}
	}
}

.popup {
	button {
		text-align: left;
		justify-content: left;

		padding-left: .75em;
		padding-right: .75em;
	}
}
</style>
