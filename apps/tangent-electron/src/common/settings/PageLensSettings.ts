import { LensSettings, type LensSettingsType } from "./LensSettings"
import type { SettingDefinition } from "./Setting"
import Setting from "./Setting"

const pagePathDefinition: SettingDefinition<string> = {
	name: 'Page Path',
	form: 'file',
	defaultValue: ''
}

export default class PageLensSettings extends LensSettings {

	readonly pagePath = new Setting(pagePathDefinition)

	constructor(patch?: any) {
		super({ name: PageLensSettings.staticName })
		if (patch) this.applyPatch(patch)
		this.setupObservables()
	}

	get type() { return PageLensSettings.staticType }
	static get staticType() { return 'PageLensSettings' }
	static get staticName() { return 'Page' }
	static get staticIcon() { return ['file.svg#document', 'file.svg#text'] }
	static get staticDescription() {
		return 'Displays a specific note as if it were its own page.'
	}

	getIcon(): string | string[] {
		return PageLensSettings.staticIcon
	}
}

PageLensSettings satisfies LensSettingsType
