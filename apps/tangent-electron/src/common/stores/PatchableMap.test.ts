import { describe, test, expect, it } from 'vitest'

import { ObjectStore, WritableStore, PatchableMap, PatchableMapPatch, PatchableMapPatchType } from './'

interface SimpleTestItem {
	id: string
}

class SimpleTestMap extends PatchableMap<string, SimpleTestItem, string> {
	constructor() {
		super()
	}

	protected convertKeyToPatch(key) { return key }
	protected convertPatchKeyToKey(patch) { return patch }

	protected convertValueToPatch(value) {
		return value.id
	}

	protected convertPatchValueToValue(patchValue) {
		return {
			id: patchValue
		}
	}
}

test('Basic manipulation', () => {

	const map = new SimpleTestMap();

	let lastMap: Map<string, SimpleTestItem> = null
	map.subscribe(m => lastMap = m)

	let lastPatch: PatchableMapPatch<string> = null
	map.observePatch(patch => {
		lastPatch = patch
	})

	map.applyPatch({
		there: 'are',
		test: 'cases'
	})

	expect(lastPatch).toBeNull()
	expect([...map.entries()]).toEqual([
		['there', { id: 'are' }],
		['test', { id: 'cases' }]
	])

	let item = { id: 'mate' }

	map.set('dude', item)

	expect(lastPatch).toEqual({
		_patch_type: PatchableMapPatchType.Set,
		patch: { dude: 'mate' }
	})
	expect(map.get('dude')).toBe(item)

	lastMap = null
	map.applyPatch({
		_patch_type: PatchableMapPatchType.Set,
		patch: {
			bro: 'damn',
			damn: 'son'
		}
	})

	expect([...map.entries()]).toEqual([
		['there', { id: 'are' }],
		['test', { id: 'cases' }],
		['dude', { id: 'mate' }],
		['bro', { id: 'damn' }],
		['damn', { id: 'son' }]
	])

	map.delete('test')

	expect(lastPatch).toEqual({
		_patch_type: PatchableMapPatchType.Delete,
		patch: {
			test: null
		}
	})
})

class StoreTestItem extends ObjectStore {

	value: WritableStore<string> = new WritableStore<string>(null)

	constructor(initial?) {
		super()

		if (initial) {
			this.applyPatch(initial)
		}

		this.setupObservables()
	}
}

class StoreTestMap extends PatchableMap<number, StoreTestItem, any> {
	constructor() {
		super(null, {
			observeItems: true
		})
	}

	protected convertKeyToPatch(key: number) { return key.toString() }
	protected convertPatchKeyToKey(patch: string) { return parseInt(patch) }

	protected convertValueToPatch(value: StoreTestItem) {
		return value.getRawValues()
	}

	protected convertPatchValueToValue(patchValue) {
		return new StoreTestItem(patchValue)
	}
}

test('Map with sub-stores', () => {
	const map = new StoreTestMap()

	let lastPatch: PatchableMapPatch<any> = null
	let patchCount = 0
	map.observePatch(patch => {
		lastPatch = patch
		patchCount++
	})

	let payload = {
		'1': { value: 'first' },
		'2': { value: 'second' }
	}

	map.applyPatch(payload)
	expect(map.getRawValues()).toEqual(payload)

	let item = map.get(1)
	item.value.set('thing')

	// Test setting values
	expect(lastPatch).toEqual({
		_patch_type: PatchableMapPatchType.Update,
		patch: {
			'1': { value: 'thing' }
		}
	})
	expect(patchCount).toEqual(1)

	// Test setting value to itself
	map.set(1, item)
	// _do_ send a patch in this case
	expect(patchCount).toEqual(2)

	map.delete(1)
	lastPatch = null

	item.value.set('test')
	// Should no longer be observing items
	expect(lastPatch).toBeNull()
})

describe('Map patching from raw', () => {
	it('Should not report a change when a raw patch matches raw items', () => {
		const patch = {
			there: 'are',
			test: 'cases'
		}

		const map = new SimpleTestMap()
		map.applyPatch(patch)
		const changed = map.applyPatch(patch)

		expect(changed).toBeFalsy()
	})

	it('Should not report a change when a raw patch matches patchable items', () => {
		const patch = {
			'1': { value: 'test' },
			'2': { value: 'cases' }
		}

		const map = new StoreTestMap()
		map.applyPatch(patch)
		const changed = map.applyPatch(patch)

		expect(changed).toBeFalsy()
	})
})