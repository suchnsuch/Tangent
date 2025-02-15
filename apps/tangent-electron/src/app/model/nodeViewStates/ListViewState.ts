import ListLensSettings from 'common/settings/ListLensSettings';
import { SetLensViewState } from './LensViewState';
import { SetViewState } from './SetViewState';
import { derived, Readable } from 'svelte/store';
import { TreeNodeOrReference } from 'common/nodeReferences';
import { sortNodes } from 'common/settings/Sorting';
import ListView from 'app/views/node-views/ListView.svelte';
import ListSettingsView from 'app/views/node-views/ListSettingsView.svelte';

export default class ListViewState implements SetLensViewState {
	readonly parent: SetViewState
	readonly settings: ListLensSettings

	readonly items: Readable<TreeNodeOrReference[]>

	constructor(parent: SetViewState, settings: ListLensSettings) {
		this.parent = parent
		this.settings = settings

		this.items = derived(
			[parent.nodes, settings.sorting.sortMode],
			([nodes, sortMode]) => {
				return sortNodes(nodes, sortMode, this.parent.context.workspace.directoryStore)
			}
		)
	}

	get viewComponent() { return ListView }
	get settingsComponent() { return ListSettingsView }
}
