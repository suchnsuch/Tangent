import { describe, test, expect, it } from 'vitest'

import CharacterFeeder from './CharacterFeeder'

describe('Find Behind', () => {
	test('Stopping on new line', () => {
		const feeder = new CharacterFeeder('Hello\nThere')
		feeder.index = feeder.text.indexOf('r')

		const result = feeder.findBehind('o')
		expect(result).toEqual({
			index: feeder.text.indexOf('T'),
			foundMatch: false,
			char: 'T'
		})
	})
})

describe('Iteration', () => {
	it('Should step through normal text correctly', () => {
		const feeder = new CharacterFeeder('Hi there')
		expect(feeder.currentChar).toEqual('H')
		expect(feeder.next()).toEqual('i')
		expect(feeder.next()).toEqual(' ')
		expect(feeder.next()).toEqual('t')
	})

	it('Should step through simple emoji with the full emoji', () => {
		const feeder = new CharacterFeeder('Hi 😉 there')
		expect(feeder.currentChar).toEqual('H')
		expect(feeder.next()).toEqual('i')
		expect(feeder.next()).toEqual(' ')
		expect(feeder.next()).toEqual('😉')
		expect(feeder.next()).toEqual(' ')
		expect(feeder.next()).toEqual('t')
	})

	it('Should step through compound emoji with the full emoji', () => {
		const feeder = new CharacterFeeder('Hi 👨‍👩‍👧‍👦 there')
		expect(feeder.currentChar).toEqual('H')
		expect(feeder.next()).toEqual('i')
		expect(feeder.next()).toEqual(' ')
		expect(feeder.next()).toEqual('👨‍👩‍👧‍👦')
		expect(feeder.next()).toEqual(' ')
		expect(feeder.next()).toEqual('t')
	})

	it('Should peek through normal text correctly', () => {
		const feeder = new CharacterFeeder('Hi there')
		expect(feeder.currentChar).toEqual('H')
		expect(feeder.peek()).toEqual('i')
	})

	it('Should peek through simple emoji with the full emoji', () => {
		const feeder = new CharacterFeeder('M🙃G')
		expect(feeder.currentChar).toEqual('M')
		expect(feeder.peek()).toEqual('🙃')
		expect(feeder.next(2)).toEqual('G')
		expect(feeder.peek(-1)).toEqual('🙃')
	})

	it('Should stop at the end', () => {
		const feeder = new CharacterFeeder('Test')
		expect(feeder.currentChar).toEqual('T')
		expect(feeder.next()).toEqual('e')
		expect(feeder.next()).toEqual('s')
		expect(feeder.next()).toEqual('t')
		expect(feeder.next()).toEqual(undefined)
		expect(feeder.index).toEqual(4)
		expect(feeder.hasMore()).toEqual(false)
	})
})

describe('Forward consumption', () => {
	test('checkFor and consume', () => {
		const feeder = new CharacterFeeder('peek')
		expect(feeder.currentChar).toEqual('p')
		expect(feeder.checkFor('peek')).toBe(true)
		expect(feeder.currentChar).toEqual('k')
	})

	test('consumeSequentialCharacters', () => {
		const feeder = new CharacterFeeder('oop')
		expect(feeder.currentChar).toEqual('o')
		expect(feeder.consumeSequentialCharacters('o')).toEqual(2)
		expect(feeder.currentChar).toEqual('o')
		expect(feeder.index).toEqual(1)
	})

	test('getLineText', () => {
		const feeder = new CharacterFeeder('Look at this\ntest')
		expect(feeder.getLineText(undefined, true)).toEqual('Look at this')
		expect(feeder.currentChar).toEqual('\n')
	})
})
