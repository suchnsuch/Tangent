import { ObjectStore, WritableStore, type ObjectStoreOptions, type RawValueMode } from "common/stores"

export type LensSettingsConfig = ObjectStoreOptions & {
	name?: string
}

export abstract class LensSettings extends ObjectStore {

	name: WritableStore<string>

	constructor(config?: LensSettingsConfig) {
		super(config)
		this.name = new WritableStore(config?.name)
	}

	getRawValues(mode?: RawValueMode) {
		const result = super.getRawValues(mode)
		result.type = this.type
		return result
	}

	abstract get type(): string
}

export interface LensSettingsType {
	new (patch?: any): LensSettings
	get staticType(): string
	get staticName(): string
}
