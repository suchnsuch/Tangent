import type { SettingDefinition } from './Setting'
import Setting from './Setting'
import { NodeSortStore } from './Sorting'
import { LensSettings, type LensSettingsType } from './LensSettings'

const startAtDefinition: SettingDefinition<string> = {
	name: 'Start At',
	description: 'Determines whether the feed starts from the beginning or the end of the list.',
	validValues: [
		{
			value: 'beginning',
			displayName: 'Beginning',
			description: 'The feed will default to the beginning of the list.'
		},
		{
			value: 'end',
			displayName: 'End',
			description: 'The feed will default to the end of the list.'
		},
	],
	defaultValue: 'beginning'
}

export default class FeedLensSettings extends LensSettings {

	sorting = new NodeSortStore()
	startAt = new Setting(startAtDefinition)

	constructor(patch?: any) {
		super({ name: FeedLensSettings.staticName })
		if (patch) this.applyPatch(patch)
		this.setupObservables()
	}

	get type() { return FeedLensSettings.staticType }
	static get staticType() { return 'FeedLensSettings' }
	static get staticName() { return 'Feed' }
	static get staticIcon() { return 'lenses.svg#feed' }
	static get staticDescription() {
		return 'Displays items in an infinite scrolling feed.'
	}

	getIcon(): string | string[] {
		return FeedLensSettings.staticIcon
	}
}

FeedLensSettings satisfies LensSettingsType
