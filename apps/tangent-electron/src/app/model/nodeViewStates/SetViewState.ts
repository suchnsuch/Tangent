import { CachingStore, ReadableStore, SelfStore } from 'common/stores'
import type SetInfo from 'common/dataTypes/SetInfo';
import type { TreeNode } from 'common/trees'
import type { TreeNodeOrReference } from 'common/nodeReferences';
import type NodeSet from 'common/NodeSet'
import type { CreationRuleOrDefinition } from 'common/settings/CreationRule';
import { derived, Readable } from 'svelte/store';
import type { NodeViewState } from '.';
import CardsViewState from './CardsViewState';
import FeedViewState from './FeedViewState';
import type LensViewState from './LensViewState';
import type ViewStateContext from './ViewStateContext';

export interface SetViewState extends NodeViewState, NodeSet {
	context: ViewStateContext
	info: Readable<SetInfo>
}

export abstract class BaseSetViewState extends SelfStore implements SetViewState {
	readonly context: ViewStateContext

	protected _nodes: Readable<TreeNodeOrReference[]>
	protected _creationRules: Readable<CreationRuleOrDefinition[]>
	
	protected _currentLens: ReadableStore<LensViewState>

	constructor(context) {
		super()
		this.context = context
	}

	get nodes() { return this._nodes }
	get creationRules() { return this._creationRules}

	get currentLens() {
		if (!this._currentLens) {
			this._currentLens = new CachingStore(derived(this.info, (info, set) => {
				if (!info) {
					set(null)
					return null
				}

				return derived(info.displayMode, mode => {
					switch(mode) {
						case 'Feed':
							return new FeedViewState(this, info.feed)
						case 'Cards':
							return new CardsViewState(this, info.cards)
					}
				}).subscribe(set)
			}), (prev, next) => {
				if (prev?.dispose) prev.dispose()
			})
		}
		return this._currentLens
	}

	focus(element: HTMLElement) {
		const lens = this.currentLens.value
		if (lens.focus) {
			return lens.focus(element)
		}
	}

	abstract get node(): TreeNode
	abstract get info(): Readable<SetInfo>

	dispose() {
		super.dispose()
		;(this._currentLens as CachingStore<LensViewState>)?.dispose()
	}
}
