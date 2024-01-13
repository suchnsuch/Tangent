import { ObjectStore } from 'common/stores'
import type { SettingDefinition } from './Setting'
import Setting from './Setting'
import { NodeSortStore } from './Sorting'

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

export default class FeedLensSettings extends ObjectStore {

	sorting = new NodeSortStore()
	startAt = new Setting(startAtDefinition)

	constructor() {
		super()
		this.setupObservables()
	}
}
