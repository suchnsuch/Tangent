<script lang="ts">
import { getContext, tick } from 'svelte'
import { type PathValidationMessages, validatePath } from 'common/trees'
import { commandTemplates, nameFromCommand, willPromptForName } from 'common/settings/ExternalCommand'
import { Workspace } from 'app/model'
import editable from 'app/utils/editable'
import SettingView from '../System/SettingView.svelte'
import { tooltip } from 'app/utils/tooltips'
import ExternalCommandTemplateButton from '../creation-rules/CreationRuleTemplateButton.svelte'
import type ExternalCommand from 'common/settings/ExternalCommand'

const workspace = getContext('workspace') as Workspace
export let command: ExternalCommand

$: commandName = command.name
$: commandTemplate = command.commandTemplate

let exampleNameMessages: PathValidationMessages = []
let templateInput: HTMLInputElement

/**
 * Insert the given insertionString into the template at the last-seen selection start position. If the lastSelectionEnd position
 * is unlike the lastSelectionStart position, then the insertion will be made between the two positions and the selected text will be removed.
 * @param insertionString the string to insert into the template
 */
function insertTextIntoTemplate(
		insertionString: string
) {
	if (templateInput) {
		// check if the user last had focus inside the template input
		const currentText = $commandTemplate
		const lastSelectionStart = templateInput.selectionStart
		const lastSelectionEnd = templateInput.selectionEnd

		if (lastSelectionStart > 0 || lastSelectionEnd > 0) {
			$commandTemplate = currentText.slice(0, lastSelectionStart) + insertionString + currentText.slice(lastSelectionEnd)

			// give the svelte UI time to redraw things
			tick().then(() => {
				//set the new selection position after the redraw has happened
				const newSelectionStart = lastSelectionStart + insertionString.length
				const newSelectionEnd = newSelectionStart

				// you only want to set this after the redraw has happened or your selection is going to bug out
				templateInput.focus()
				// need to set focus first or setting the selection range is not going to have an effect
				templateInput.setSelectionRange(newSelectionStart, newSelectionEnd)
			})
		} else {
			// user had no focus set, so we're just going to insert at the end
			$commandTemplate = currentText + insertionString

			tick().then(() => {
				templateInput.focus()
			})
		}
	}
}

function onValidateShortcut(shortcut: string) {
	return workspace.validateShortcut(shortcut, command)
}

</script>

<main>
	<header>
		<slot name="header-left"></slot>
		<!-- svelte-ignore a11y-missing-content -->
		<h2 class="name"
			use:editable={commandName}
			use:tooltip={"Define the name of the command. Set an emoji as the first character of the name to make an icon."}
		></h2>
	</header>
	{#if exampleNameMessages?.length}
		{#each exampleNameMessages as message}
			<p class={'explanation ' + message.level}>{@html message.message}</p>
		{/each}
	{/if}
	<details>
		<summary>Command Template Tokens</summary>
		<br>
		<p>These tokens are replaced with the appropriate values when command is called.</p>
		<table><tbody>
			{#each commandTemplates as commandTemplate}
				<tr><th><ExternalCommandTemplateButton templateText={commandTemplate.text} insertTemplateText={insertTextIntoTemplate}/></th><td>{commandTemplate.description}</td></tr>
			{/each}
		</tbody></table>
	</details>
	<div class="settingsGroup">
		<SettingView setting={command.shortcut} {onValidateShortcut} />
		<SettingView setting={command.commandTemplate} />
		<SettingView setting={command.description} />
	</div>
</main>

<style lang="scss">

header {
	display: flex;

	align-items: center;
	gap: .5em;

	margin-bottom: 1em;
}

h2 {
	flex-grow: 1;
}

label {
	display: flex;
	align-items: center;
	span {
		margin-right: .5em;
	}
	input {
		flex-grow: 1;
	}
}

.explanation {
	margin: .5em 2em;
	padding: 0;
	font-size: 90%;
	color: var(--deemphasizedTextColor);

	&:global(.error) {
		color: red;
	}

	&:global(.warning) {
		color: orange;
	}

	:global(.demoName) {
		white-space: pre;
	}
}

details {
	margin: 1em 2em;
	margin-right: 1em;
	font-size: 90%;

	summary {
		margin-left: -1em;
	}

	th {
		text-align: left;
		color: var(--accentTextColor);
		padding-right: .5em;
	}
}

</style>