import type { SetLensViewState } from './LensViewState';
import type { SetViewState } from './SetViewState';

import CardsView from 'app/views/node-views/CardsView.svelte'
import { derived, type Readable } from 'svelte/store';
import type { TreeNodeOrReference } from 'common/nodeReferences';
import type CardsLensSettings from 'common/settings/CardsLensSettings';
import { sortNodes } from 'common/settings/Sorting';
import CardsSettingsView from 'app/views/node-views/CardsSettingsView.svelte';
import { selectDetailsPane } from 'app/utils/selection';

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

	focus(element: HTMLElement): boolean {
		if (!element) return false
		if (this.parent.details?.value?.open && selectDetailsPane(element)) return true

		const card = element.querySelector('.CardsView .card.focused')
		if (card instanceof HTMLElement) {
			card.focus()
			return true
		}

		const container = element.querySelector('.CardsView')
		if (container instanceof HTMLElement) {
			container.focus()
			return true
		}
		return false
	}
}
