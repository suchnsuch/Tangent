import { ForwardingStore, ReadableStore, WritableStore } from 'common/stores'
import type { NodeViewState, DetailsViewState } from '.'
import EmbedFile from '../EmbedFile'
import type LensViewState from './LensViewState'
import AudioVideoView from 'app/views/node-views/AudioVideoView.svelte'
import DataFile from '../DataFile'
import AudioVideoViewInfo from 'common/dataTypes/AudioVideoViewInfo'
import ViewStateContext from './ViewStateContext'

export default class AudioVideoViewState implements NodeViewState, LensViewState {
	readonly file: EmbedFile

	readonly currentLens: ReadableStore<LensViewState>
	readonly details = new WritableStore<DetailsViewState>(null)

	readonly viewInfoFile: DataFile
	readonly viewInfo = new WritableStore<AudioVideoViewInfo>(null)

	readonly playbackPosition: WritableStore<number>

	constructor(context: ViewStateContext, file: EmbedFile) {
		this.file = file

		this.currentLens = new ReadableStore(this)

		this.playbackPosition = new ForwardingStore<number>(undefined)

		this.viewInfoFile = context.getOrCreatePersistentUuidFile(file, AudioVideoViewInfo.fileType) as DataFile
		this.viewInfoFile?.loadData<AudioVideoViewInfo>().then(info => {
			this.viewInfo.set(info)
			if (info) {{
				;(this.playbackPosition as ForwardingStore<number>).forwardFrom(info.playbackPosition)
			}}
		})
	}

	get node() { return this.file }

	// Lens interface
	get parent() { return this }
	get viewComponent() { return AudioVideoView }
}
