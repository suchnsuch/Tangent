import { RawValueMode, PatchableStore } from 'common/stores'
import { clamp } from '../utils'

interface SettingValueDescription<T> {
	value: T
	displayName?: string
	description?: string
}

export type SettingType = string | number | boolean
export type SettingArrayType = SettingType[]
export type SettingValue<T extends SettingType> = SettingValueDescription<T> | T

export function getValue<T extends SettingType>(value: SettingValue<T>): T {
	if (Array.isArray(value)) {
		return value as T
	}
	else if (typeof value === 'object') {
		return value.value
	}
	return value
}

export function getDescription<T extends SettingType>(value: SettingValue<T>): string {
	if (typeof value === 'object' && !Array.isArray(value) && value.description) {
		return value.description
	}
	return getValue(value).toString()
}

export function getDisplayName<T extends SettingType>(value: SettingValue<T>): string {
	if (typeof value === 'object' && !Array.isArray(value) && value.displayName) {
		return value.displayName
	}
	return getValue(value).toString()
}

interface SettingRange {
	min: number
	max: number
	step?: number
	softMin?: number
	softMax?: number
}

export type SettingForm = 'default' | 'folder' | 'path' | 'textarea' | 'select'

/**
 * This type malarky means the base type _must_ be simple (T), and the real value type
 * _may_ be an array, but is not by default (`V extends (T | T[]) = T`)
 * 
 * This is done because we want `validValues` to always define _single_ values
 */
export interface SettingDefinition<T extends SettingType, V extends (T | T[]) = T> {
	defaultValue?: V
	name?: string
	description?: string
	validValues?: SettingValue<T>[]
	range?: SettingRange
	form?: SettingForm
	placeholder?: string
}

export default class Setting<T extends SettingType, V extends (T | T[]) = T> extends PatchableStore<V, V> {
	baseSetting: Setting<T, V>

	private definition: SettingDefinition<T, V>
	
	constructor(definition: SettingDefinition<T, V>) {

		// Init default value
		if (definition.defaultValue === undefined) {
			// This modifies the definition, potentially modifying a shared value
			// I'm okay with this, as the default value determination is deterministic
			// This will only work with non-array values. Also okay with this
			definition.defaultValue = (definition.validValues ? getValue(definition.validValues[0]) : undefined as unknown) as V
		}

		if (definition.defaultValue === undefined) {
			throw new Error('Settings must have a default value')
		}

		super(definition.defaultValue)

		this.definition = definition
	}

	get value() {
		return this._value ?? this.baseSetting?.value ?? this.defaultValue
	}

	set value(value: V) {
		super.value = this.validateValue(value)
	}

	set(value: V) {
		this.value = value
	}

	convertFromPatch(patch: V) {
		return patch
	}

	convertToPatch(value: V) {
		return value
	}

	validateValue(value: V): V {

		if ((typeof value) !== (typeof this.defaultValue)) {
			return this.defaultValue
		}

		if (this.validValues) {
			if (Array.isArray(value)) {
				return value.filter(val => this.validValues.find(v => getValue(v) === val)) as V
			}
			else {
				const found = this.validValues.find(v => getValue(v) === value)
				if (!found) {
					return this.defaultValue
				}
			}
		}
		
		if (this.range) {
			const range = this.range
			if (Array.isArray(value)) {
				// Brittle, but if you're wondering why past me didn't support mixed values, fuck you
				return value.map(v => clamp(v as number, range.min, range.max, range.step)) as V
			}
			else if (typeof value === 'number') {
				return clamp(value, range.min, range.max, range.step) as V
			}
		}
		return value
	}

	getRawValues(mode: RawValueMode = 'patch') {
		if (mode === 'file' && (this._value == undefined || this._value === this.defaultValue)) return undefined
		return this._value
	}

	// Defintion forwards
	get name() {
		return this.definition.name
	}

	get defaultValue() {
		return this.definition.defaultValue
	}

	get description() {
		return this.definition.description
	}

	get validValues() {
		return this.definition.validValues
	}

	get range() {
		return this.definition.range
	}
	
	get form() {
		return this.definition.form
	}

	get placeholder() {
		return this.definition.placeholder
	}
}
