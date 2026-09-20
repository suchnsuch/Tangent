import { PatchableList, type RawValueMode } from 'common/stores'
import { type LensSettings, type LensSettingsType } from './LensSettings'
import Logger from 'js-logger'

const log = Logger.get('LensSettingsList')

type LensSettingsListTypeConfig = {
	[key: string]: LensSettingsType
}

export type LensSettingsListConfig = {
	types: LensSettingsListTypeConfig
	defaultType: string
}

export function lensSettingsTypesToConfig(types: LensSettingsType[]): LensSettingsListTypeConfig {
	const result: LensSettingsListTypeConfig = {}

	for (const type of types) {
		result[type.staticType] = type
	}

	return result
}

type AtLeastOne<T, U = {[K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]

type FindLensArgs = {
	name: string
	type: string
}

export class LensSettingsList extends PatchableList<LensSettings, any> {
	config: LensSettingsListConfig

	constructor(config: LensSettingsListConfig) {
		super([], { patchItems: true })
		this.config = config
	}

	findLens({ name, type }: AtLeastOne<FindLensArgs>): LensSettings {
		if (name) {
			for (const lensSettings of this) {
				if (lensSettings.name.value === name) {
					return lensSettings
				}
			}
		}
		
		if (type) {
			for (const lensSettings of this) {
				if (lensSettings.type === type) {
					return lensSettings
				}
			}
		}
		
		return undefined
	}

	findOrCreateLens(args: Pick<FindLensArgs, 'type'> & Partial<FindLensArgs>): LensSettings {
		const result = this.findLens(args)
		if (result) return result

		// Try to create one as a fallback
		for (const key of Object.keys(this.config.types)) {
			if (key === args.type) {
				const lens = new (this.config.types[key])()
				this.add(lens)
				log.info('Creating lens', args.type)
				return lens
			}
		}

		log.error(`No type found for "${args.type}"`)

		return undefined
	}

	protected convertFromPatchItem(patchItem: any): LensSettings {
		if (typeof patchItem.type === 'string') {
			const constructor = this.config.types[patchItem.type]
			if (!constructor) {
				log.error(`No constructor defined for type "${patchItem.type}"`)
				return null
			}

			return new constructor(patchItem)
		}
		else {
			log.error('No type on patch.', patchItem)
			return null
		}
	}

	protected convertToPatchItem(item: LensSettings, mode?: RawValueMode | number) {
		return item.getRawValues(typeof mode === 'string' ? mode : 'patch')
	}
}
