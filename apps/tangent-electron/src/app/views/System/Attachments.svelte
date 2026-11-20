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
		<p class="value-details explanation">
			The <code>$filename</code> token can be used to inject the name of the file that the attachment is being pasted into.
		</p>
	</div>
		<div class="settingsGroup">
		<SettingView setting={settings.attachedFilenameFormat} />
		<p class="value-details explanation">
			If Random Number is selected and filename is "data.txt" then during duplicates it will be in format "data_1675675489.txt", "data_2947355435.txt",etc
		</p>
		<p class="value-details explanation">
			If Timestamp is selected and filename is "data.txt" then it will be in format "data_2025-11-26-15-45-50.txt"
		</p>
		
	</div>
</main>
