import { test, expect } from 'vitest'

import { ObjectStore, WritableStore, PatchableList, PatchableListPatch, PatchableListPatchType, RawValueMode } from './'

interface SimpleTestItem {
	id: string
}

class SimpleTestList extends PatchableList<SimpleTestItem, string> {
	constructor(value?: SimpleTestItem[]) {
		super(value)
	}

	protected convertToPatchItem(item: SimpleTestItem) {
		return item?.id
	}

	protected convertFromPatchItem(patchItem: string) {
		return { id: patchItem }
	}
}

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

class StoreTestList extends PatchableList<StoreTestItem, any> {
	constructor(value?: StoreTestItem[]) {
		super(value, {
			patchItems: true
		})
	}

	protected convertFromPatchItem(patchItem: any) {
		return new StoreTestItem(patchItem)
	}
}

test('Basic manipulation', () => {

	const list = new SimpleTestList();

	let lastList: SimpleTestItem[] = null
	list.subscribe(list => lastList = list)

	let lastPatch: PatchableListPatch<string> = null
	list.observePatch(patch => {
		lastPatch = patch
	})

	list.applyPatch([
		'hello', 'there'
	])

	expect(lastPatch).toBeNull()
	expect(list.value).toEqual([
		{ id: 'hello' },
		{ id: 'there' }
	])

	let item = { id: 'mate' }

	list.add(item)

	expect(lastPatch).toEqual({
		_patch_type: PatchableListPatchType.Splice,
		startIndex: 2,
		items: ['mate']
	})
	expect(list.get(2)).toBe(item)

	lastList = null
	list.applyPatch({
		_patch_type: PatchableListPatchType.Splice,
		startIndex: 1,
		deleteCount: 2,
		items: ['giggidy', 'goo']
	})

	expect(list.value).toEqual([
		{ id: 'hello' },
		{ id: 'giggidy' },
		{ id: 'goo' }
	])
	expect(lastList).toEqual([
		{ id: 'hello' },
		{ id: 'giggidy' },
		{ id: 'goo' }
	])

	list.removeAt(0)

	expect(lastPatch).toEqual({
		_patch_type: PatchableListPatchType.Splice,
		startIndex: 0,
		deleteCount: 1
	})

	// Ensure applying raw patches works
	let changed = list.applyPatch([
		'giggidy', 'goo'
	])

	expect(changed).toBeFalsy()

	changed = list.applyPatch([
		'giggidy', 'goo', 'baby'
	])

	expect(changed).toBeTruthy()

	expect(list.value).toEqual([
		{ id: 'giggidy' },
		{ id: 'goo' },
		{ id: 'baby'}
	])

	changed = list.applyPatch([
		'wicked'
	])

	expect(changed).toBeTruthy()

	expect(list.value).toEqual([
		{ id: 'wicked' }
	])
})

test('List with sub-stores', () => {
	const list = new StoreTestList()

	let lastPatch: PatchableListPatch<any> = null
	list.observePatch(patch => {
		lastPatch = patch
	})

	let payload = [
		{
			value: 'stuff'
		},
		{
			value: 'here'
		}
	]

	list.applyPatch(payload)
	expect(list.getRawValues()).toEqual(payload)

	let item = list.get(1)
	item.value.set('thing')

	expect(lastPatch).toEqual({
		_patch_type: PatchableListPatchType.Update,
		startIndex: 1,
		items: [{
			value: 'thing'
		}]
	})

	list.remove(item)
	lastPatch = null

	item.value.set('test')
	// Should no longer be observing items
	expect(lastPatch).toBeNull()
})

test('Patching patchable items reports correct change status', () => {
	const list = new StoreTestList()

	list.applyPatch([
		{ value: 'stuff' },
		{ value: 'thing' }
	])

	let changed = list.applyPatch([
		{ value: 'stuff' },
		{ value: 'thing' }
	])
	expect(changed).toBeFalsy()

	changed = list.applyPatch([
		{ value: 'stuff' },
		{ value: 'thing' },
		{ value: 'newThing' }
	])

	expect(changed).toBeTruthy()
	expect(list.get(2).value.value).toEqual('newThing')
	expect(list.length).toEqual(3)

	changed = list.applyPatch([
		{ value: 'something else' }
	])
	expect(changed).toBeTruthy()
	expect(list.get(0).value.value).toEqual('something else')
	expect(list.length).toEqual(1)
})


type RawTestItem = {
	value: string
}

class ObjectTestList extends PatchableList<RawTestItem, RawTestItem> {
	constructor(value?: RawTestItem[]) {
		super(value)
	}

	protected convertFromPatchItem(patchItem: RawTestItem) {
		return { ...patchItem }
	}

	protected convertToPatchItem(item: RawTestItem, mode?: number | RawValueMode): RawTestItem {
		return { ...item }
	}
}


test('Patching non-patching items reports correct change status', () => {
	const list = new ObjectTestList()

	list.applyPatch([
		{ value: 'stuff' },
		{ value: 'thing' }
	])

	let changed = list.applyPatch([
		{ value: 'stuff' },
		{ value: 'thing' }
	])
	expect(changed).toBeFalsy()

	changed = list.applyPatch([
		{ value: 'stuff' },
		{ value: 'thing' },
		{ value: 'newThing' }
	])

	expect(changed).toBeTruthy()
	expect(list.get(2).value).toEqual('newThing')
	expect(list.length).toEqual(3)

	changed = list.applyPatch([
		{ value: 'something else' }
	])
	expect(changed).toBeTruthy()
	expect(list.get(0).value).toEqual('something else')
	expect(list.length).toEqual(1)
})
