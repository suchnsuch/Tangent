import { describe, test, expect } from 'vitest'

import { StructureData, StructureType } from './indexTypes'
import { diffStructure } from './structureUtils'

describe('diffStructure()', () => {
	test('Adding new items', () => {
		const prev: StructureData[] = []
		const next: StructureData[] = [
			{
				type: StructureType.Link,
				href: 'Foo',
				form: 'wiki',
				start: 80,
				end: 100,
				to: 'the moon'
			},
			{
				type: StructureType.Header,
				level: 1,
				text: 'I am a header',
				start: 101,
				end: 120,
			}
		]

		const result = diffStructure(prev, next)

		expect(result.removed).toEqual([])
		expect(result.added).toEqual(next)
	})

	test('Adding new items to an existing set', () => {
		const prev: StructureData[] = [
			{
				type: StructureType.Header,
				level: 1,
				text: 'I am a header',
				start: 101,
				end: 120
			}
		]

		const next: StructureData[] = [
			{
				type: StructureType.Link,
				href: 'Foo',
				form: 'wiki',
				start: 80,
				end: 100,
				to: 'the moon'
			},
			{
				type: StructureType.Header,
				level: 1,
				text: 'I am a header',
				start: 101,
				end: 120
			},
			{
				type: StructureType.Header,
				level: 2,
				text: 'I am a sub-header',
				start: 140,
				end: 160
			}
		]

		const result = diffStructure(prev, next)

		expect(result.removed).toEqual([])
		expect(result.added).toEqual([next[0], next[2]])
	})

	test('Swapping one set for another', () => {
		const prev: StructureData[] = [
			{
				type: StructureType.Header,
				level: 1,
				text: 'I am a header',
				start: 101,
				end: 120
			}
		]

		const next: StructureData[] = [
			{
				type: StructureType.Link,
				href: 'Foo',
				form: 'wiki',
				start: 80,
				end: 100,
				to: 'the moon'
			},
			{
				type: StructureType.Header,
				level: 2,
				text: 'I am a sub-header',
				start: 140,
				end: 160
			}
		]

		const result = diffStructure(prev, next)

		expect(result.removed).toEqual(prev)
		expect(result.added).toEqual(next)
	})

	test('Mixed changes with matching links', () => {
		const prev: StructureData[] = [
			{
				type: StructureType.Link,
				href: 'Foo',
				form: 'wiki',
				start: 80,
				end: 100,
				to: 'the moon'
			},
		]

		const next: StructureData[] = [
			{
				type: StructureType.Link,
				href: 'Foo',
				form: 'wiki',
				start: 10,
				end: 15,
				to: 'the moon'
			},
			{
				type: StructureType.Link,
				href: 'Foo',
				form: 'wiki',
				start: 80,
				end: 100,
				to: 'the moon'
			}
		]

		const result = diffStructure(prev, next)

		expect(result.removed).toEqual([])
		// This is technically "wrong" but expected for now
		expect(result.added).toEqual([next[1]])
	})
})
