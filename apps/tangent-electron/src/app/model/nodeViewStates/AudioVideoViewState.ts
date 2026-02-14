import { ForwardingStore, ReadableStore, WritableStore } from 'common/stores'
import type { NodeViewState, DetailsViewState } from '.'
import EmbedFile from '../EmbedFile'
import type LensViewState from './LensViewState'
import AudioVideoView from 'app/views/node-views/AudioVideoView.svelte'
import DataFile from '../DataFile'
import AudioVideoViewInfo from 'common/dataTypes/AudioVideoViewInfo'
import ViewStateContext from './ViewStateContext'
import { DetailsViewStateStore } from './NodeViewState'
import type { PartialLink } from 'common/indexing/indexTypes'

export function timeFromContentId(content_id: string) {
	const timeMatch = content_id?.match(/time=([\d\.:]+)/)
	if (!timeMatch) return -1

	const valueMatch = timeMatch[1].match(/(\d+\.?\d*:?)/g)
	if (!valueMatch) return -1

	// There may be a clever way of doing this
	// but it's early and I'm not trying hard yet
	const multipliers = (() => {
		switch (valueMatch.length) {
			case 3:
				return [3600, 60, 1]
			case 2:
				return [60, 1]
			case 1:
				return [1]
		}
	})()

	if (multipliers) {
		let time = 0
		for (let i = 0; i < valueMatch.length; i++) {
			let string = valueMatch[i]
			if (!string) return -1 // Empty segments are invalid
			let value = parseFloat(string)
			time += value * multipliers[i]
		}
		return time
	}
}

export default class AudioVideoViewState implements NodeViewState, LensViewState {
	readonly file: EmbedFile

	readonly currentLens: ReadableStore<LensViewState>
	readonly details = new DetailsViewStateStore<DetailsViewState>(null)

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
				const store = this.playbackPosition as ForwardingStore<number>
				store.forwardFromRetainingCurrentValue(info.playbackPosition)
			}}
		})
	}

	get node() { return this.file }

	// Lens interface
	get parent() { return this }
	get viewComponent() { return AudioVideoView }

	highlightLink(link: PartialLink) {
		if (!link) return

		if (link.content_id) {
			const time = timeFromContentId(link.content_id)
			if (time >= 0) {
				this.playbackPosition.set(time)
			}
		}
	}
}
