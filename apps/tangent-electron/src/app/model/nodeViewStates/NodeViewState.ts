import type { Readable, Writable } from 'svelte/store'
import type { SvelteConstructor } from 'app/utils/svelte'
import type { TreeChange, TreeNode } from 'common/trees'
import type { ReadableStore } from 'common/stores'
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
	readonly details?: Writable<DetailsViewState>

	dispose?()
	focus?(element: HTMLElement): boolean
	onTreeChange?(change: TreeChange)
}
