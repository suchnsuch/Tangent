<script lang="ts">
import { getContext } from 'svelte'
import { isMac } from 'common/isMac'
import type Workspace from 'app/model/Workspace'

import SettingView from './SettingView.svelte'

let workspace = getContext('workspace') as Workspace
let settings = workspace.settings

</script>

<main>
	<div class="settingsGroup">
		<SettingView setting={settings.appearance} />
		<SettingView setting={settings.accentHue} />
		<SettingView setting={settings.accentSaturation} />
		<span class="value-details">
			<span style="background: var(--accentBackgroundColor)">Accent Background</span>
			<span style="color: var(--accentTextColor)">Accent Text</span>
		</span>
		<SettingView setting={settings.uiFontSize} />
		<SettingView setting={settings.panelWidthMin} />

		{#if !isMac}
			<SettingView setting={settings.scrollBarWidth} />
		{/if}

		<SettingView setting={settings.sidebarHoverHotspot} />
	</div>
</main>

<style>
.value-details {
	text-align: center;
	padding-bottom: 1em;
}
.value-details > span {
	padding: .2em 1em;
}
</style>
