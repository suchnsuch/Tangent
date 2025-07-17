<script lang="ts">
import type CreationRule from 'common/settings/CreationRule'
import { nameFromRule, willPromptForName } from 'common/settings/CreationRule'
import editable from 'app/utils/editable'
import SettingView from '../System/SettingView.svelte'
import { tooltip } from 'app/utils/tooltips'
import { PathValidationMessages, validatePath } from 'common/trees'
import { tick } from 'svelte';
import CreationRuleTemplateButton from './CreationRuleTemplateButton.svelte'

export let rule: CreationRule

$: ruleName = rule.name
$: nameTemplate = rule.nameTemplate

let asksForName = false
let exampleName = ''
let exampleNameMessages: PathValidationMessages = []

let templateInput: HTMLInputElement

$: templateDependencies($nameTemplate)
function templateDependencies(template) {
	asksForName = willPromptForName(template)
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

		if (willPromptForName(template)) {
			messages.unshift({
				level: 'info',
				message: 'Will prompt for a name on creation.'
			})
		}

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
		const currentText = $nameTemplate
		const lastSelectionStart = templateInput.selectionStart
		const lastSelectionEnd = templateInput.selectionEnd

		if (lastSelectionStart > 0 || lastSelectionEnd > 0) {
			$nameTemplate = currentText.slice(0, lastSelectionStart) + insertionString + currentText.slice(lastSelectionEnd)

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
			$nameTemplate = currentText + insertionString
		}
	}
}

</script>

<main>
	<header>
		<slot name="header-left"></slot>
		<!-- svelte-ignore a11y-missing-content -->
		<h2 class="name"
			use:editable={ruleName}
			use:tooltip={"Define the name of the rule. Set an emoji as the first character of the name to make an icon."}
		></h2>
	</header>
	<label use:tooltip={"Defines how the note will be named. Refer to the Template Token list for available dynamic values."}>
		<span>Name Template</span>
		<input type="text" bind:value={$nameTemplate} bind:this={templateInput}/>
	</label>
	{#if exampleNameMessages?.length}
		{#each exampleNameMessages as message}
			<p class={'explanation ' + message.level}>{@html message.message}</p>
		{/each}
	{/if}
	<details>
		<summary>Name Template Tokens</summary>
		<p>You can use the following tokens to automate some aspects of note naming.<br/>
			Click the buttons to insert the token text at the end of the string or where your input currently is.</p>
		<table>
			<tr>
				<th><CreationRuleTemplateButton templateText="%name%" insertTemplateText={insertTextIntoTemplate}/></th>
				<td>
					The name of the note.
					A blank template is equivalent to a template with just this value.
				</td>
			</tr>
		</table>
		<h4>Date & Time</h4>
		<p>These tokens are replaced with the appropriate values based on when the note is created.</p>
		<figure>
			<table>
				<tr><th><CreationRuleTemplateButton templateText="%YYYY%" insertTemplateText={insertTextIntoTemplate}/></th><td>The full year.</td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%YY%" insertTemplateText={insertTextIntoTemplate}/></th><td>The last two digits of the year.</td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%MM%" insertTemplateText={insertTextIntoTemplate}/></th><td>The two digit month. e.g. "05" for May.</td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%M%" insertTemplateText={insertTextIntoTemplate}/></th><td>The single digit month. e.g. "5" for May, "10" for October.</td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%DD%" insertTemplateText={insertTextIntoTemplate}/></th><td>The two digit day of the month. e.g. "07".<sup>1</sup></td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%D%" insertTemplateText={insertTextIntoTemplate}/></th><td>The single digit day of the month. e.g. "5", "15".<sup>1</sup></td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%HH%" insertTemplateText={insertTextIntoTemplate}/></th><td>The two digit hour of the day (24 hour clock).</td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%H%" insertTemplateText={insertTextIntoTemplate}/></th><td>The single digit hour of the day (24 hour clock).</td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%mm%" insertTemplateText={insertTextIntoTemplate}/></th><td>The two digit minute of the hour.</td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%m%" insertTemplateText={insertTextIntoTemplate}/></th><td>The single digit minute of the hour.</td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%ss%" insertTemplateText={insertTextIntoTemplate}/></th><td>The two digit second of the minute.</td></tr>
				<tr></tr>
				<tr><th><CreationRuleTemplateButton templateText="%Month%" insertTemplateText={insertTextIntoTemplate}/></th><td>The full name of the month.<sup>2</sup></td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%Mth%" insertTemplateText={insertTextIntoTemplate}/></th><td>The shortened name of the month.<sup>2</sup></td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%WeekDay%" insertTemplateText={insertTextIntoTemplate}/></th><td>The full name of the week day.<sup>2</sup></td></tr>
				<tr><th><CreationRuleTemplateButton templateText="%WDay%" insertTemplateText={insertTextIntoTemplate}/></th><td>The short name of the week day.<sup>2</sup></td></tr>
			</table>
			<figcaption>
				<table>
					<tr><th>1</th><td>Append "o" to use ordinal numbers, e.g. "1st", "2nd", "3rd".</td></tr>
					<tr><th>2</th><td>Can be made all-caps or all lowercase by making the token all caps or all lowercase.</td></tr>
				</table>
			</figcaption>
		</figure>
	</details>
	<div class="settingsGroup">
		<SettingView setting={rule.folder} />
		<SettingView setting={rule.mode} />
		<SettingView setting={rule.showInMenu} />
		<SettingView setting={rule.description} />
		<SettingView setting={rule.openInContext} />
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

figure {
	margin-right: 0;
}

figcaption {
	color: var(--deemphasizedTextColor);
	padding-top: 1em;

	th {
		color: var(--textColor);
		vertical-align: top;
	}
}

</style>