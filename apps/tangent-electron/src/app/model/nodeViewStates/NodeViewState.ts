import type { Readable } from 'svelte/store'
import type { SvelteConstructor } from 'app/utils/svelte'
import type { TreeChange, TreeNode } from 'common/trees'
import type { ReadableStore, WritableStore } from 'common/stores'
import type LensViewState from './LensViewState'

export interface DetailsViewState {
	open: boolean
	tab: string
}

export interface NodeViewState {
	// Can be implemented as a property backed by the real object
	readonly node: TreeNode

	readonly currentLens: ReadableStore<LensViewState>

	settingsComponent?: SvelteConstructor
	readonly pinSettings?: Readable<boolean>

	detailsSummaryComponent?: SvelteConstructor
	readonly details?: WritableStore<DetailsViewState>

	dispose?()
	focus?(element: HTMLElement): boolean
	onTreeChange?(change: TreeChange)
}
