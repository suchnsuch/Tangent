import { ObjectStore } from 'common/stores'
import CardsLensSettings from 'common/settings/CardsLensSettings';
import FeedLensSettings from 'common/settings/FeedLensSettings';
import Setting, { SettingDefinition } from 'common/settings/Setting';

// TODO: This needs to be derived from some other list
export type SetLensMode = 'Cards' | 'Feed'

const setLensDefinition: SettingDefinition<SetLensMode> = {
	name: 'Display Mode',
	validValues: [
		{
			value: 'Cards',
			description: 'Displays items as a series of cards.'
		},
		{
			value: 'Feed',
			description: 'Dislays items as a continuous stream of data.'
		}
	],
	defaultValue: 'Cards'
}

/**
 * The common settings for all 
 */
export default abstract class SetInfo extends ObjectStore {
	displayMode = new Setting(setLensDefinition)

	feed: FeedLensSettings
	cards: CardsLensSettings

	constructor() {
		super()

		// TODO: Some way of not saving data until used
		this.feed = new FeedLensSettings()
		this.cards = new CardsLensSettings()
	}
}
