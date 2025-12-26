import { ReadableStore } from 'common/stores'
import type { NodeViewState } from '.'
import EmbedFile from '../EmbedFile'
import type LensViewState from './LensViewState'
import PdfView from 'app/views/node-views/PdfView.svelte'

export default class PdfViewState implements NodeViewState, LensViewState {
	readonly file: EmbedFile

	readonly currentLens: ReadableStore<LensViewState>

	constructor(file: EmbedFile) {
		this.file = file
		this.currentLens = new ReadableStore(this)
	}

	get node() { return this.file }

	// Lens interface
	get parent() { return this}
	get viewComponent() { return PdfView }
}
