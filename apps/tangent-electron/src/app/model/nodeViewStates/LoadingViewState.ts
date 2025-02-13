import { SvelteConstructor } from 'app/utils/svelte'
import LensViewState from './LensViewState'
import NodeViewState from './NodeViewState'
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