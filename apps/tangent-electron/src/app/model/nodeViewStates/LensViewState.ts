import type { SvelteConstructor } from 'app/utils/svelte'
import type { TreeNodeOrReference } from 'common/nodeReferences'
import type { NodeViewState } from '.'
import type { SetViewState } from './SetViewState'

export default interface LensViewState {
	parent: NodeViewState

	viewComponent: SvelteConstructor
	settingsComponent?: SvelteConstructor

	documentationPage?: string
	
	dispose?()
	
	// Allows the state to apply focus
	focus?(element: HTMLElement): boolean

	/*
	 * Optionally allow the lens to represent a given node.
	 */
	willRepresent?(node: TreeNodeOrReference): boolean
	/*
	 * The optional node represented via willRepresent
	 */
	readonly currentlyRepresenting?: TreeNodeOrReference
	/*
	 * The view state handling the representation of `currentlyRepresenting`
	 */
	readonly currentlyRepresentingView?: NodeViewState
}

export interface SetLensViewState extends LensViewState {
	parent: SetViewState
}
