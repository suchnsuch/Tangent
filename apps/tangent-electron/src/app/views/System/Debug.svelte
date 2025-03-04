<script lang="ts">
import { getContext } from 'svelte'
import type Workspace from 'app/model/Workspace'

import SettingView from './SettingView.svelte'

let workspace = getContext('workspace') as Workspace
let settings = workspace.settings

</script>

<main>
	<p>
		These settings are intended for debugging purposes only.
		Changing them can potentially break critical functionality!
	</p>
	<div class="settingsGroup">
		<SettingView setting={settings.debug_sendCrashReports} />
		<SettingView setting={settings.debug_createVirtualFiles} />
		<SettingView setting={settings.debug_sendItemsToTrash} />
		<SettingView setting={settings.debug_ioQueue_enable} />
		<SettingView setting={settings.debug_ioQueue_maxActive} />
	</div>
</main>

<style>
p {
	color: coral;
	margin: 1em 2em;
}
</style>
