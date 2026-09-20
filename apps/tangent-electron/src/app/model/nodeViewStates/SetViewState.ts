import { CachingStore, ReadableStore, SelfStore, WritableStore } from 'common/stores'
import type SetInfo from 'common/dataTypes/SetInfo';
import type { TreeNode } from 'common/trees'
import type { TreeNodeOrReference } from 'common/nodeReferences';
import type NodeSet from 'common/NodeSet'
import type { CreationRuleOrDefinition } from 'common/settings/CreationRule';
import { derived, type Readable } from 'svelte/store';
import type { DetailsViewState, NodeViewState } from '.';
import ListViewState from './ListViewState';
import CardsViewState from './CardsViewState';
import FeedViewState from './FeedViewState';
import type LensViewState from './LensViewState';
import type ViewStateContext from './ViewStateContext';
import LoadingViewState from './LoadingViewState';
import { DetailsViewStateStore, NodeViewSettingsVisibilityStore } from './NodeViewState';
import type { LensSettings } from 'common/settings/LensSettings';
import CardsLensSettings from 'common/settings/CardsLensSettings';
import FeedLensSettings from 'common/settings/FeedLensSettings';
import ListLensSettings from 'common/settings/ListLensSettings';
import type { SetViewInfo } from 'common/dataTypes/SetViewInfo';

export interface SetViewState extends NodeViewState, NodeSet {
	context: ViewStateContext
	info: Readable<SetInfo>
}

function lensSettingsToViewState(parent: SetViewState, lensSettings: LensSettings): LensViewState {
	// I don't love this, but it works
	if (lensSettings instanceof CardsLensSettings) {
		return new CardsViewState(parent, lensSettings)
	}
	if (lensSettings instanceof FeedLensSettings) {
		return new FeedViewState(parent, lensSettings)
	}
	if (lensSettings instanceof ListLensSettings) {
		return new ListViewState(parent, lensSettings)
	}
}

export abstract class BaseSetViewState extends SelfStore implements SetViewState {
	readonly context: ViewStateContext

	protected _nodes: Readable<TreeNodeOrReference[]>
	protected _creationRules: Readable<CreationRuleOrDefinition[]>
	
	protected _currentLensSettings: ReadableStore<LensSettings | 'loading'>
	protected _currentLens: ReadableStore<LensViewState>

	protected _lensOverride: string

	readonly details = new DetailsViewStateStore<DetailsViewState>(null)
	readonly showSettings = new NodeViewSettingsVisibilityStore(false)

	constructor(context) {
		super()
		this.context = context
	}

	get nodes() { return this._nodes }
	get creationRules() { return this._creationRules}

	get currentLensSettings() {
		if (!this._currentLensSettings) {
			this._currentLensSettings = new CachingStore(derived(this.info, (info, set) => {
				if (!info) {
					set('loading')
					return null
				}

				return derived(
					[this as BaseSetViewState, info.defaultLens, info.lensSettings],
					([me, defaultLens, lensSettingsList]) => {
						let found: LensSettings = null
						console.log('looking for', defaultLens)
						for (const lensSettings of lensSettingsList) {
							if (lensSettings.name.value === defaultLens) {
								found = lensSettings
								break
							}
						}

						if (me.lensTypeOverride && (found?.type !== me.lensTypeOverride)) {
							// This allows a type override to hit what would be the default anyway
							// This accounts for the default not being the first of its type
							console.log('making override?')
							return info.lensSettings.findOrCreateLens({ type: me.lensTypeOverride })
						}

						if (found) return found

						if (lensSettingsList.length) {
							// Go for the first real item
							return lensSettingsList[0]
						}

						// Create the default fallback
						console.log('making fallback')
						return info.lensSettings.findOrCreateLens({ type: info.lensSettings.config.defaultType })
					}
				).subscribe(set)
			}))
		}
		return this._currentLensSettings
	}

	get currentLens() {
		if (!this._currentLens) {
			this._currentLens = new CachingStore(
				derived(
					this.currentLensSettings,
					(lensSettings, set) => {
						if (lensSettings === 'loading') {
							set(new LoadingViewState(this))
							return null
						}

						set(lensSettingsToViewState(this, lensSettings))
					}
				),
				(prev, next) => {
					if (prev?.dispose) prev.dispose()
				}
			)
		}
		return this._currentLens
	}

	/** A lens type override */
	get lensTypeOverride() { return this._lensOverride }
	set lensTypeOverride(value: string) {
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
		if (this._currentLensSettings instanceof CachingStore) {
			this._currentLensSettings.dispose()
		}
	}
}
