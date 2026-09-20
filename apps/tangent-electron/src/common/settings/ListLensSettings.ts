import { NodeSortStore } from './Sorting'
import { LensSettings, type LensSettingsType } from './LensSettings'

export default class ListLensSettings extends LensSettings {
	sorting = new NodeSortStore()

	constructor(patch?: any) {
		super({ name: ListLensSettings.staticName })
		if (patch) this.applyPatch(patch)
		this.setupObservables()
	}

	get type() { return ListLensSettings.staticType }
	static get staticType() { return 'ListLensSettings' }
	static get staticName() { return 'List' }
}

ListLensSettings satisfies LensSettingsType
