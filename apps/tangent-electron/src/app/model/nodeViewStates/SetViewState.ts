import { CachingStore, ReadableStore, SelfStore } from 'common/stores'
import type SetInfo from 'common/dataTypes/SetInfo';
import { SetLensMode } from 'common/dataTypes/SetInfo';
import type { TreeNode } from 'common/trees'
import type { TreeNodeOrReference } from 'common/nodeReferences';
import type NodeSet from 'common/NodeSet'
import type { CreationRuleOrDefinition } from 'common/settings/CreationRule';
import { derived, Readable } from 'svelte/store';
import type { NodeViewState } from '.';
import ListViewState from './ListViewState';
import CardsViewState from './CardsViewState';
import FeedViewState from './FeedViewState';
import type LensViewState from './LensViewState';
import type ViewStateContext from './ViewStateContext';
import LoadingViewState from './LoadingViewState';

export interface SetViewState extends NodeViewState, NodeSet {
	context: ViewStateContext
	info: Readable<SetInfo>
}

export abstract class BaseSetViewState extends SelfStore implements SetViewState {
	readonly context: ViewStateContext

	protected _nodes: Readable<TreeNodeOrReference[]>
	protected _creationRules: Readable<CreationRuleOrDefinition[]>
	
	protected _currentLens: ReadableStore<LensViewState>

	protected _lensOverride: SetLensMode

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
					set(new LoadingViewState(this))
					return null
				}

				return derived([this as BaseSetViewState, info.displayMode], ([me, mode]) => {
					switch(me.lensOverride ?? mode) {
						case 'List':
							return new ListViewState(this, info.list)
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

	get lensOverride() { return this._lensOverride }
	set lensOverride(value: SetLensMode) {
		this._lensOverride = value
		this.notifyChanged()
	}

	get isLensOverridden() { return this._lensOverride != undefined }

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
		if (this._currentLens instanceof CachingStore) {
			this._currentLens.dispose()
		}	
	}
}
