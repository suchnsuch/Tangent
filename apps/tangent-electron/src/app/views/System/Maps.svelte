<script lang="ts">
import { getContext } from 'svelte'
import type Workspace from 'app/model/Workspace'
import SettingView from './SettingView.svelte'

let workspace = getContext('workspace') as Workspace
let settings = workspace.settings
</script>

<main>
	<div class="settingsGroup">
		<SettingView setting={settings.mapZoomScrollMode} />
		<SettingView setting={settings.mapZoomSensitivity} />
	</div>
	<div class="settingsGroup">
		<SettingView setting={settings.openMapWhenThreadEmptied} />
		<SettingView setting={settings.showPreviousThreadsOnMap} />
		<SettingView setting={settings.showIconsOnMapNodes} />
	</div>
</main>
