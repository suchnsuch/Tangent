<script lang="ts">
import type CreationRule from 'common/settings/CreationRule'
import { nameFromRule, willPromptForName } from 'common/settings/CreationRule'
import editable from 'app/utils/editable'
import SettingView from '../System/SettingView.svelte'

export let rule: CreationRule

$: ruleName = rule.name
$: nameTemplate = rule.nameTemplate

let asksForName = false
let exampleName = ''

$: templateDependencies($nameTemplate)
function templateDependencies(template) {
	asksForName = willPromptForName(template)
	exampleName = nameFromRule(rule.getDefinition(), 'Example Name') as string
	return 
}
</script>

<main>
	<header>
		<slot name="header-left"></slot>
		<!-- svelte-ignore a11y-missing-content -->
		<h2 class="name" use:editable={ruleName} title="Define the name of the rule. Set an emoji as the first character of the name to make an icon."></h2>
	</header>
	<label title="Defines how the note will be named. Refer to the Template Token list for available dynamic values.">
		<span>Name Template</span>
		<input type="text" bind:value={$nameTemplate} />
	</label>
	{#if asksForName}
		<p class="explanation">
			Will prompt for a name on creation.
		</p>
	{/if}
	<p class="explanation">
		Will create notes named like: "<span class="demoName">{exampleName}</span>"
	</p>
	<details>
		<summary>Name Template Tokens</summary>
		<p>You can use the following tokens to automate some aspects of note naming.</p>
		<table>
			<tr>
				<th>%name%</th>
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
				<tr><th>%YYYY%</th><td>The full year.</td></tr>
				<tr><th>%YY%</th><td>The last two digits of the year.</td></tr>
				<tr><th>%MM%</th><td>The two digit month. e.g. "05" for May.</td></tr>
				<tr><th>%M%</th><td>The single digit month. e.g. "5" for May, "10" for October.</td></tr>
				<tr><th>%DD%</th><td>The two digit day of the month. e.g. "07".<sup>1</sup></td></tr>
				<tr><th>%D%</th><td>The single digit day of the month. e.g. "5", "15".<sup>1</sup></td></tr>
				<tr><th>%HH%</th><td>The two digit hour of the day (24 hour clock).</td></tr>
				<tr><th>%H%</th><td>The single digit hour of the day (24 hour clock).</td></tr>
				<tr><th>%mm%</th><td>The two digit minute of the hour.</td></tr>
				<tr><th>%m%</th><td>The single digit minute of the hour.</td></tr>
				<tr><th>%ss%</th><td>The two digit second of the minute.</td></tr>
				<tr></tr>
				<tr><th>%Month%</th><td>The full name of the month.<sup>2</sup></td></tr>
				<tr><th>%Mth%</th><td>The shortened name of the month.<sup>2</sup></td></tr>
				<tr><th>%WeekDay%</th><td>The full name of the week day.<sup>2</sup></td></tr>
				<tr><th>%WDay%</th><td>The short name of the week day.<sup>2</sup></td></tr>
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
	font-size: 90%;
	color: var(--deemphasizedTextColor);
}

.demoName {
	white-space: pre;
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