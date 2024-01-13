<script lang="ts">
import { getContext } from 'svelte'
import type Workspace from 'app/model/Workspace'

import SettingView from './SettingView.svelte'

let workspace = getContext('workspace') as Workspace
let settings = workspace.settings

</script>

<main>
	<h2>Files</h2>
	<div class="settingsGroup">
		<SettingView setting={settings.dirtyIndicatorVisibility} />
	</div>	
	<h2>Links</h2>
	<div class="settingsGroup">
		<SettingView setting={settings.areLinksCaseSensitive} />
	</div>
</main>
