import { ReadableStore } from 'common/stores'
import { NodeViewState } from '.'
import EmbedFile from '../EmbedFile'
import LensViewState from './LensViewState'
import AudioVideoView from 'app/views/node-views/AudioVideoView.svelte'

export default class AudioVideoViewState implements NodeViewState, LensViewState {
	readonly file: EmbedFile

	readonly currentLens: ReadableStore<LensViewState>

	constructor(file: EmbedFile) {
		this.file = file

		this.currentLens = new ReadableStore(this)
	}

	get node() { return this.file }

	// Lens interface
	get parent() { return this }
	get viewComponent() { return AudioVideoView }
}
