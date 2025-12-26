import type { Readable } from 'svelte/store'
import type { SvelteConstructor } from 'app/utils/svelte'
import type { TreeChange, TreeNode } from 'common/trees'
import type { ReadableStore } from 'common/stores'
import type LensViewState from './LensViewState'

export default interface NodeViewState {
	// Can be implemented as a property backed by the real object
	readonly node: TreeNode

	readonly currentLens: ReadableStore<LensViewState>

	settingsComponent?: SvelteConstructor
	readonly pinSettings?: Readable<boolean>

	dispose?()
	focus?(element: HTMLElement): boolean
	onTreeChange?(change: TreeChange)
}
