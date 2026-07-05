<script lang="ts">
import { getContext, tick } from 'svelte'
import { type PathValidationMessages, validatePath } from 'common/trees'
import type AttachmentRule from 'common/settings/AttachmentRule'
import { nameFromRule } from 'common/settings/AttachmentRule'
import { Workspace } from 'app/model'
import editable from 'app/utils/editable'
import SettingView from '../System/SettingView.svelte'
import { tooltip } from 'app/utils/tooltips'

export let rule: AttachmentRule
$: name = rule.path

let exampleName = ''
let exampleNameMessages: PathValidationMessages = []

$: templateDependencies($name)
function templateDependencies(template) {
	exampleName = nameFromRule(rule.getDefinition(), 'Example Name') as string

	let messages: PathValidationMessages = []
	const validation = validatePath(exampleName, messages)

	if (validation === false) {
		messages.unshift({
			level: 'error',
			message: 'This path cannot be used.'
		})

		messages.sort((a, b) => {
			// This is a very simple, stupid sort, but it puts errors in front and that's what's needed
			if (a.level === b.level) return 0
			if (a.level === 'error') return -1
			if (b.level === 'error') return 1
			return 0
		})
	}
	else if (validation !== exampleName) {
		exampleName = validation
	}

	if (!messages.find(m => m.level === 'error')) {

		// if (willPromptForName(template)) {
		// 	messages.unshift({
		// 		level: 'info',
		// 		message: 'Will prompt for a name on creation.'
		// 	})
		// }

		if (exampleName.includes('/')) {
			messages.push({
				level: 'info',
				message: `Will create notes in folders named like: "<span class="demoName">${exampleName}</span>".`
			})
		}
		else {
			messages.push({
				level: 'info',
				message: `Will create notes named like: "<span class="demoName">${exampleName}</span>".`
			})
		}
	}

	exampleNameMessages = messages
}
</script>

<main>
	<header>
		<slot name="header-left"></slot>
		<!-- svelte-ignore a11y-missing-content -->
		<h2 class="name"
			use:editable={name}
			use:tooltip={"Define the name of the rule. Set an emoji as the first character of the name to make an icon."}
		></h2>
	</header>
	{#if exampleNameMessages?.length}
		{#each exampleNameMessages as message}
			<p class={'explanation ' + message.level}>{@html message.message}</p>
		{/each}
	{/if}

	<div class="settingsGroup">
		<SettingView setting={rule.path} />
		<SettingView setting={rule.resolveMode} />
		<SettingView setting={rule.description} />
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

</style>