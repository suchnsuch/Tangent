import { describe, test, expect } from 'vitest'

import { derived, Readable } from 'svelte/store'
import { WritableStore, ObjectStore, PatchableList, PatchableMap } from './'

test('Nested object stores', () => {
	let root = new ObjectStore() as any

	root.something = new ObjectStore()
	root.somethingElse = new ObjectStore()

	root.someValue = new WritableStore('test')
	root.somethingElse.otherValue = new WritableStore('test2')

	root.setupObservables()

	expect(root.getRawValues()).toEqual({
		something: {},
		someValue: 'test',
		somethingElse: {
			otherValue: 'test2'
		}
	})

	let patchResult = null

	root.observePatch(patch => {
		patchResult = patch
	})

	// Test posting/bubbling patch changes
	root.someValue.set('doom')
	expect(patchResult).toEqual({ someValue: 'doom' })

	root.somethingElse.otherValue.set('gloom')
	expect(patchResult).toEqual({
		somethingElse: {
			otherValue: 'gloom'
		}
	})

	// Test applying patch changes
	patchResult = false
	root.applyPatch({ someValue: 'barn' })
	// Should not post patch when applying patch
	expect(patchResult).toEqual(false)
	expect(root.someValue.value).toEqual('barn')

	root.applyPatch({
		somethingElse: {
			otherValue: 'owl'
		}
	})
	// Should not post patch when applying patch
	expect(patchResult).toEqual(false)
	expect(root.somethingElse.otherValue.value).toEqual('owl')
})

class TestClass {
	value: string
	constructor(value) {
		this.value = value
	}
}

test('Patch safety', () => {
	let root = new ObjectStore() as any

	root._privateValue = new WritableStore('private')
	root.complexValue = new WritableStore(new TestClass('complex'))

	root.numberValue = new WritableStore(0)
	root.stringValue = new WritableStore('string')
	root.arrayValue = new WritableStore(['a', 'list'])

	root.setupObservables()

	let patchResult = null
	root.observePatch(patch => {
		patchResult = patch
	})

	// Values with underscores should not send patches
	root._privateValue.set('poked')
	expect(patchResult).toBeNull()

	// Non-POJSO objects should not be patched
	root.complexValue.set(new TestClass('other'))
	expect(patchResult).toBeNull()

	// Other values should work fine
	root.numberValue.set(5)
	expect(patchResult).toEqual({ numberValue: 5 })
	
	root.stringValue.set('foo')
	expect(patchResult).toEqual({ stringValue: 'foo' })

	root.arrayValue.set(['a', 'different', 'list'])
	expect(patchResult).toEqual({ arrayValue: ['a', 'different', 'list'] })
})

describe('Patch equality', () => {
	test('Value changes should report as changed', () => {
		const store = new ObjectStore()
		;(store as any).value = new WritableStore(0)
		expect(store.applyPatch({ value: 1 })).toBeTruthy()
	})

	test('The same value should not report as changed', () => {
		const store = new ObjectStore()
		;(store as any).value = new WritableStore(0)
		expect(store.applyPatch({ value: 0 })).toBeFalsy()
	})

	test('Value changes to negative should report as changed', () => {
		const store = new ObjectStore()
		;(store as any).value = new WritableStore(0)
		expect(store.applyPatch({ value: -1 })).toBeTruthy()
	})
})

test('Raw store mirror', () => {
	let root = new ObjectStore({ applyToRawValues: true }) as any

	root.applyPatch({
		raw: { some: 'raw', data: 'yep' }
	})
	expect(root.raw).toEqual({ some: 'raw', data: 'yep' })

	class TestMap extends PatchableMap<string, any, any> {
		convertKeyToPatch(key: string) { return key }
		convertPatchKeyToKey(key: string) { return key }
		convertValueToPatch(value: any) { return value }
		convertPatchValueToValue(value: any) { return value }
	}

	let patchMap = new TestMap()
	patchMap.observePatch(patch => {
		root.applyPatch({
			'map': patch
		})
	})

	patchMap.set('foo', 'boo')
	expect(root.map.foo).toEqual('boo')

	patchMap.set('foo', { test: 5 })
	expect(root.map.foo).toEqual({ test: 5 })

	patchMap.delete('foo')
	expect(root.map.foo).toBeFalsy()

	patchMap.set('foo', { thing: 'stuff' })
	expect(root.map.foo).toEqual({ thing: 'stuff' })

	patchMap.set('foo', null)
	expect(root.map.foo).toBeNull()

	patchMap.set(null)
	expect(root.map).toBeNull()

	class TestList extends PatchableList<any, any> {
		convertFromPatchItem(patch: any) { return patch }
		convertToPatchItem(item: any) { return item }
	}

	let patchList = new TestList()
	patchList.observePatch(patch => {
		root.applyPatch({
			'list': patch
		})
	})

	patchList.set(['test', 'this'])
	expect(root.list).toEqual(['test', 'this'])

	patchList.removeAt(0)
	expect(root.list).toEqual(['this'])

	patchList.insert(0, { something: 'else' })
	expect(root.list).toEqual([{ something: 'else' }, 'this'])

	patchList.set(null)
	expect(root.list).toBeNull()
})

describe('Observables and ordering', () => {
	class TestClass extends ObjectStore {
		a: WritableStore<string>
		b: WritableStore<string>

		constructor() {
			super()

			this.a = new WritableStore<string>('foo')
			this.setupObservables()
			this.b = new WritableStore<string>('goo')
		}
	}

	class WrapperClass extends ObjectStore {
		child: TestClass

		constructor() {
			super()

			this.child = new TestClass()
			this.setupObservables()
		}
	}

	test('Stores created after setupObservables should not cause patch events', () => {
		const myClass = new TestClass()
		let rawPatch = null
		myClass.observePatch(p => rawPatch = p)
		myClass.b.set('bam')
		
		expect(rawPatch).toBeNull()
	})

	test('ObjectStores inside ObjectStores should not duplicate observable setup', () => {
		const wrapper = new WrapperClass()
		let rawPatch = null
		wrapper.observePatch(p => rawPatch = p)
		wrapper.child.b.set('bam')

		expect(rawPatch).toBeNull()
	})
})

describe('Patching & non-writable stores', () => {
	class HasDerivedStore extends ObjectStore {
		a = new WritableStore('boo')
		b: Readable<string>

		constructor() {
			super()
			this.b = derived(this.a, a => a + '2')
			this.setupObservables()
		}
	}

	test('Non-writable stores are not sent as patch values', () => {
		const store = new HasDerivedStore()
		let rawPatch = null
		store.observePatch(p => rawPatch = p)

		store.a.set('goo')
		expect(rawPatch).toEqual({
			a: 'goo'
		})
	})

	test('Non-writable stores are not included in raw values', () => {
		const store = new HasDerivedStore()
		expect(store.getRawValues()).toEqual({
			a: 'boo'
		})
	})
})
