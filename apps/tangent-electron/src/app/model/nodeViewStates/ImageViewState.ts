import { WritableStore, ReadableStore } from 'common/stores'
import type { DetailsViewState, NodeViewState } from '.'
import type EmbedFile from '../EmbedFile'
import type LensViewState from './LensViewState'

import ImageView from 'app/views/node-views/ImageView.svelte'
import type { SettingDefinition } from 'common/settings/Setting'
import ZoomSetting from 'common/settings/ZoomSetting'
import { selectDetailsPane } from 'app/utils/selection'

const imageZoomDefinition: SettingDefinition<number> = {
	defaultValue: 1,
	range: {
		min: .1,
		max: 5
	}
}

export default class ImageViewState implements NodeViewState, LensViewState {
	readonly file: EmbedFile
	readonly zoom = new ZoomSetting(imageZoomDefinition)
	readonly panX = new WritableStore<number>(0)
	readonly panY = new WritableStore<number>(0)

	readonly currentLens: ReadableStore<LensViewState>;

	readonly details = new WritableStore<DetailsViewState>(null)

	constructor(file: EmbedFile) {
		this.file = file

		this.currentLens = new ReadableStore(this)
	}

	get node() { return this.file }

	// Lens interface
	get parent() { return this }
	get viewComponent() { return ImageView }

	focus(element: HTMLElement): boolean {
		if (!element) return false
		if (this.details?.value?.open && selectDetailsPane(element)) return true
		const container = element.querySelector('.ImageView')
		if (container instanceof HTMLElement) {
			container.focus()
			return true
		}
		return false
	}
}
