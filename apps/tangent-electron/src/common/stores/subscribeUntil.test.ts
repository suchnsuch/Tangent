import { describe, expect, it } from 'vitest'
import { subscribeUntil } from './subscribeUntil'
import { WritableStore } from './WritableStore'

it('Subscribes until a successful value is set', () => {
	const test = new WritableStore('foo')
	let callCount = 0

	subscribeUntil(test, value => {
		callCount++
		return value === 'done'
	})

	// Always check at first
	expect(callCount).toEqual(1)
	expect((test as any).observers.length).toEqual(1)

	test.set('nope')
	expect(callCount).toEqual(2)
	expect((test as any).observers.length).toEqual(1)

	test.set('done')
	expect(callCount).toEqual(3)
	expect((test as any).observers.length).toEqual(0)
})

it('Handles a value being immediately valid', () => {
	const test = new WritableStore('valid')
	subscribeUntil(test, value => value === 'valid')

	queueMicrotask(() => {
		expect((test as any).observers.length).toEqual(0)
	});
})
