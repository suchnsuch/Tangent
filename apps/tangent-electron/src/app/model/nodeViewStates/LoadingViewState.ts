import type { SvelteConstructor } from 'app/utils/svelte'
import type LensViewState from './LensViewState'
import type { NodeViewState } from './NodeViewState'
import LoadingView from 'app/views/node-views/LoadingView.svelte'

export default class LoadingViewState implements LensViewState {
	readonly parent: NodeViewState;

	constructor(parent: NodeViewState) {
		this.parent = parent
	}

	get viewComponent(): SvelteConstructor {
		return LoadingView
	}
}