<script lang="ts">
import { getContext } from 'svelte'
import { isMac } from 'common/platform'
import type Workspace from 'app/model/Workspace'

import SettingView from './SettingView.svelte'

let workspace = getContext('workspace') as Workspace
let settings = workspace.settings

</script>

<main>
	<div class="settingsGroup">
		{#if !isMac}
			<SettingView setting={settings.titlebar} />
		{/if}
		<SettingView setting={settings.appearance} />
		<SettingView setting={settings.accentHue} />
		<SettingView setting={settings.accentSaturation} />
		<span class="value-details">
			<span class="background">Accent Background</span>
			<span class="text">Accent Text</span>
		</span>
		<SettingView setting={settings.uiFontSize} />
		<SettingView setting={settings.panelWidthMin} />

		{#if !isMac}
			<SettingView setting={settings.scrollBarWidth} />
		{/if}
	</div>

	<div class="settingsGroup">
		<SettingView setting={settings.sidebarHoverHotspot} />
		<SettingView setting={settings.panelSettingsHoverHotspot} />
		<SettingView setting={settings.showPromptInstructions} />
	</div>
</main>

<style>
.value-details {
	text-align: center;
	padding-bottom: 1em;
}
.value-details > span {
	padding: .2em 1em;
	border-radius: var(--inputBorderRadius);
}
.background {
	background: var(--accentActiveBackgroundColor);
	cursor: pointer;
	&:hover {
		background: var(--accentBackgroundColor);
	}
}
.text {
	user-select: text;
	background: var(--noteBackgroundColor);
	color: var(--accentTextColor);
}
</style>
