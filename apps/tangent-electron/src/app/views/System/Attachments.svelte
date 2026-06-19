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
		<p class="value-details explanation">
			A closest path (e.g. <code>./**/assets/figs</code>) will recursively goes up untill finds <code>assets/figs</code> folder.
		</p>
		<p class="value-details explanation">
			paths can be separated by comma (,). this is mostly used as fallback for closest path. (e.g. <code>./**/assets/figs, ./**/figs, glob/</code>)
		</p>
	</div>
</main>
