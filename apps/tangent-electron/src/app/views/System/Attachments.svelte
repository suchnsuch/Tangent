<script lang="ts">
import { getContext } from 'svelte'
import type Workspace from 'app/model/Workspace'

import SettingView from './SettingView.svelte'

let workspace = getContext('workspace') as Workspace
let settings = workspace.settings

</script>

<main style="display: flex; flex-direction: column;">
	<div style=" display: inline-grid; margin: 0 auto;" class="container">
		<table><tbody>
			<tr>
				<th>Resolve</th>
				<th>Path</th>
			</tr>
			<tr>
				<td>
					<select>
						<option>static</option>
						<option>upward </option>
					</select>
				</td>
				<td>
					<input type="text" class="grow" />
				</td>
			</tr>
			<tr>
				<td>
					<select>
						<option>static</option>
						<option>upward </option>
					</select>
				</td>
				<td>
					<input type="text" class="grow" />
				</td>
			</tr>
			<tr>
				<td>
					<select>
						<option>static</option>
						<option>upward </option>
					</select>
				</td>
				<td>
					<input type="text" class="grow" />
				</td>
			</tr>
		</tbody></table>

		<button>
			new path
		</button>
	</div>
	
	<SettingView setting={settings.defaultPasteLocation} />

	<div class="settingsGroup">
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
</main>
