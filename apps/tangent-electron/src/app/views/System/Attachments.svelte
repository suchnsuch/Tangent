<script lang="ts">
import { getContext } from 'svelte'
import type Workspace from 'app/model/Workspace'

import SettingView from './SettingView.svelte'

let workspace = getContext('workspace') as Workspace
let settings = workspace.settings

</script>

<main>
	<div class="settingsGroup">
		<SettingView setting={settings.defaultPasteLocation} />
		<p class="value-details explanation">
			A direct path (e.g. "Some/Path") will be interpretted from the root of the workspace.
		</p>
		<p class="value-details explanation">
			Relative paths (e.g. "./Path", "./", "../") will resolve based on the note the attachment is coming from.
		</p>
	</div>
</main>
