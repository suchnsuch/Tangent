import { ReadableStore, WritableStore } from 'common/stores'
import type { DetailsViewState, NodeViewState } from '.'
import EmbedFile from '../EmbedFile'
import type LensViewState from './LensViewState'
import PdfView from 'app/views/node-views/PdfView.svelte'
import { DetailsViewStateStore } from './NodeViewState'
import type { PartialLink } from 'common/indexing/indexTypes'
import ZoomSetting from 'common/settings/ZoomSetting'
import type { SettingDefinition } from 'common/settings/Setting'

export function pageFromContentId(content_id: string) {
	const matched = content_id?.match(/page=(\d+)/)
	if (matched) {
		return parseInt(matched[1])
	}
	return -1
}

const imageZoomDefinition: SettingDefinition<number> = {
	defaultValue: 1,
	range: {
		min: .1,
		max: 5
	}
}

export default class PdfViewState implements NodeViewState, LensViewState {
	readonly file: EmbedFile

	readonly currentLens: ReadableStore<LensViewState>
	readonly details = new DetailsViewStateStore<DetailsViewState>(null)

	readonly zoom = new ZoomSetting(imageZoomDefinition)
	readonly panX = new WritableStore<number>(0)
	readonly panY = new WritableStore<number>(0)

	readonly targetPage = new WritableStore(-1)

	constructor(file: EmbedFile) {
		this.file = file
		this.currentLens = new ReadableStore(this)
	}

	get node() { return this.file }

	// Lens interface
	get parent() { return this}
	get viewComponent() { return PdfView }

	highlightLink(link: PartialLink) {
		if (!link) return

		if (link.content_id) {
			this.targetPage.set(pageFromContentId(link.content_id))
		}
	}
}
