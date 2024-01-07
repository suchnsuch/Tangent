import type { SetLensViewState } from './LensViewState';
import type { SetViewState } from './SetViewState';

import CardsView from 'app/views/node-views/CardsView.svelte'
import { derived, Readable } from 'svelte/store';
import type { TreeNodeOrReference } from 'common/nodeReferences';
import type CardsLensSettings from 'common/settings/CardsLensSettings';
import { sortNodes } from 'common/settings/Sorting';
import CardsSettingsView from 'app/views/node-views/CardsSettingsView.svelte';

export default class CardsViewState implements SetLensViewState {
	readonly parent: SetViewState
	readonly settings: CardsLensSettings

	readonly items: Readable<TreeNodeOrReference[]>

	constructor(parent: SetViewState, settings: CardsLensSettings) {
		this.parent = parent
		this.settings = settings

		this.items = derived(
			[parent.nodes, settings.sorting.sortMode],
			([nodes, sortMode]) => {
				return sortNodes([...nodes], sortMode, this.parent.context.workspace.directoryStore)
			})
	}

	get viewComponent() { return CardsView }
	get settingsComponent() { return CardsSettingsView }
}
