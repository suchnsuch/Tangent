import { WritableStore } from './WritableStore'

export class ValidatingStore<T> extends WritableStore<T> {

	private validator: (value: T) => T

	constructor(value: T, validator: (value: T) => T) {
		super(value)
		this.validator = validator
	}

	get value() { return this._value }
	set value(value: T) {
		const validatedValue = this.validator(value)
		if (this._value !== validatedValue || validatedValue !== value) {
			const oldValue = this._value
			this._value = validatedValue
			this.onValueChanged(oldValue)
		}
	}
}
