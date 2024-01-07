import { valueToString } from './logging'

describe('valueToString', () => {
	it('Should hand raw strings across', () => {
		expect(valueToString('foo')).toEqual('foo')
	})

	it('Should include objects', () => {
		expect(valueToString({
			test: 'value',
			other: 'thing'
		})).toEqual(`{
	test: value
	other: thing
}
`)
	})

	it('Should support object nesting', () => {
		expect(valueToString({
			foo: { test: 'value' }
		})).toEqual(`{
	foo: {
		test: value
	}
}
`)
	})

	it('Should handle null/undefined keys', () => {
		expect(valueToString({
			no: null,
			nope: undefined
		})).toEqual(`{
	no: <null>
	nope: <undefined>
}
`)
	})

	it('Should handle nullish values', () => {
		expect(valueToString(null)).toEqual('<null>')
		expect(valueToString(undefined)).toEqual('<undefined>')
	})

	it('Should display error messages', () => {
		const result = valueToString(new Error('This is an error')).split('\n')
		expect(result.length).toBeGreaterThan(1)
		expect(result[0]).toEqual('Error: This is an error')
	})
})
