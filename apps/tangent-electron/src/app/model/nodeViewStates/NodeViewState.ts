import type { SvelteConstructor } from 'app/utils/svelte'
import type { TreeChange, TreeNode } from 'common/trees'
import { WritableStore, type ReadableStore } from 'common/stores'
import type LensViewState from './LensViewState'

export type NodeViewSettingsVisibility = boolean | 'pin'

export interface DetailsViewState {
	open: boolean
	tab: string
}

export interface NodeViewState {
	// Can be implemented as a property backed by the real object
	readonly node: TreeNode

	readonly currentLens: ReadableStore<LensViewState>

	settingsComponent?: SvelteConstructor
	readonly showSettings?: WritableStore<NodeViewSettingsVisibility>

	detailsSummaryComponent?: SvelteConstructor
	readonly details?: DetailsViewStateStore<DetailsViewState>

	dispose?()
	focus?(element: HTMLElement): boolean
	onTreeChange?(change: TreeChange)
}

export class NodeViewSettingsVisibilityStore extends WritableStore<NodeViewSettingsVisibility> {
	private pinOverride: boolean

	constructor(value: NodeViewSettingsVisibility, pinOverride?: boolean) {
		super(value)
		this.pinOverride = pinOverride ?? false
	}

	get() {
		if (this.pinOverride) return 'pin'
		return super.value
	}

	setPinOverride(override: boolean) {
		if (this.pinOverride != override) {
			this.pinOverride = override
			this.notifyObservers()
		}
	}
}

export class DetailsViewStateStore<T extends DetailsViewState> extends WritableStore<T> {
	open(isOpen=true) {
		this.update(details => {
			return {
				...details,
				open: isOpen
			}
		})
	}

	close() {
		this.update(details => {
			return {
				...details,
				open: false
			}
		})
	}
}
