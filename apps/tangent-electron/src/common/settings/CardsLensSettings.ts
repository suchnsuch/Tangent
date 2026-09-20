import type { SettingDefinition } from './Setting'
import Setting from './Setting'
import { NodeSortStore } from './Sorting'
import { LensSettings, type LensSettingsType } from './LensSettings'

const showWordCountDefinition: SettingDefinition<boolean> = {
	name: 'Show Word Count',
	defaultValue: true
}

export default class CardsLensSettings extends LensSettings {
	sorting = new NodeSortStore()

	showWordCount = new Setting<boolean>(showWordCountDefinition)
	
	constructor(patch?: any) {
		super({ name: CardsLensSettings.staticName })
		if (patch) this.applyPatch(patch)
		this.setupObservables()
	}

	get type() { return CardsLensSettings.staticType }
	static get staticType() { return 'CardsLensSettings' }
	static get staticName() { return 'Cards' }
}

CardsLensSettings satisfies LensSettingsType
