import { ObjectStore, WritableStore } from 'common/stores'
import CardsLensSettings from 'common/settings/CardsLensSettings'
import FeedLensSettings from 'common/settings/FeedLensSettings'
import ListLensSettings from 'common/settings/ListLensSettings'
import { LensSettingsList, lensSettingsTypesToConfig, type LensSettingsListConfig } from 'common/settings/LensSettingsList'

const setLensSettingsConfig: LensSettingsListConfig = {
	types: lensSettingsTypesToConfig([
		CardsLensSettings,
		FeedLensSettings,
		ListLensSettings
	]),
	defaultType: CardsLensSettings.staticType
}

/**
 * The common settings for all 
 */
export default abstract class SetInfo extends ObjectStore {
	defaultLens: WritableStore<string>
	lensSettings: LensSettingsList

	constructor() {
		super()

		this.defaultLens = new WritableStore(null)
		this.lensSettings = new LensSettingsList(setLensSettingsConfig)
	}

	applyPatch(patch: any, sendPatch?: boolean): boolean {

		// convert any old state to new state
		if (patch.cards) {
			this.lensSettings.add(new CardsLensSettings(patch.cards))
			delete patch.cards
		}
		if (patch.feed) {
			this.lensSettings.add(new FeedLensSettings(patch.feed))
			delete patch.feed
		}
		if (patch.list) {
			this.lensSettings.add(new ListLensSettings(patch.list))
			delete patch.list
		}
		if (typeof patch.displayMode === 'string') {
			this.defaultLens.set(patch.displayMode)
			this.lensSettings.findOrCreateLens({
				name: patch.displayMode,
				type: this.lensSettings.config.defaultType
			})
			delete patch.displayMode
		}

		return super.applyPatch(patch, sendPatch)
	}
}
