import ListLensSettings from 'common/settings/ListLensSettings';
import type { SetLensViewState } from './LensViewState';
import type { SetViewState } from './SetViewState';
import { derived, type Readable } from 'svelte/store';
import type { TreeNodeOrReference } from 'common/nodeReferences';
import { sortNodes } from 'common/settings/Sorting';
import ListView from 'app/views/node-views/ListView.svelte';
import ListSettingsView from 'app/views/node-views/ListSettingsView.svelte';

export const arrowNavigateTargetSelector = '.arrowNavigate, .WorkspaceFileHeader .title'
const arrowNavigateTargetFocusedSelector = '.arrowNavigate.focused, .WorkspaceFileHeader .title.focused'

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

	focus(element: HTMLElement): boolean {
		const container = element.querySelector('.ListView')
		console.log(container)
		if (container instanceof HTMLElement) {
			const focusedTarget = container.querySelector(arrowNavigateTargetFocusedSelector)
			if (focusedTarget instanceof HTMLElement) {
				focusedTarget.focus()
				return true
			}
			else container.focus()

			return true
		}
		return false
	}
}
