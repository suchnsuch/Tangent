import { test, expect } from 'vitest'

import { StoreUndoStack, ObjectStore, WritableStore, PatchableList, PatchableMap } from './'

class TextList extends PatchableList<string, string> {
	convertFromPatchItem(text) { return text }
	convertToPatchItem(text) { return text }
}

class TextMap extends PatchableMap<string, string, string> {
	convertKeyToPatch(key) { return key }
	convertPatchKeyToKey(key) { return key }
	convertValueToPatch(value) { return value }
	convertPatchValueToValue(value) { return value }
}

class TestStore extends ObjectStore {
	text = new WritableStore<string>('initial')
	list = new TextList()
	map = new TextMap()
}

class RootStore extends TestStore {
	child = new TestStore()

	constructor() {
		super()
		this.setupObservables()
	}
}

test('Simple undo/redo operations', () => {
	const root = new RootStore()
	const stack = new StoreUndoStack(root)

	root.text.set('Some new text')
	root.list.add('First')
	root.map.set('foo', 'bar')

	expect(stack.stack.length).toEqual(3)
	expect(stack.canUndo.value).toEqual(true)
	expect(stack.canRedo.value).toEqual(false)

	// Wind it back
	stack.undo()
	expect(stack.stack.length).toEqual(3)
	expect(stack.canUndo.value).toEqual(true)
	expect(stack.canRedo.value).toEqual(true)
	expect(stack.index).toEqual(1)

	expect(root.text.value).toEqual('Some new text')
	expect(root.list.value).toEqual(['First'])
	expect(root.map.size).toEqual(0)

	stack.undo()
	expect(stack.stack.length).toEqual(3)
	expect(stack.canUndo.value).toEqual(true)
	expect(stack.canRedo.value).toEqual(true)
	expect(stack.index).toEqual(0)

	expect(root.text.value).toEqual('Some new text')
	expect(root.list.value).toEqual([])
	expect(root.map.size).toEqual(0)

	stack.undo()
	expect(stack.stack.length).toEqual(3)
	expect(stack.canUndo.value).toEqual(false)
	expect(stack.canRedo.value).toEqual(true)
	expect(stack.index).toEqual(-1)

	expect(root.text.value).toEqual('initial')
	expect(root.list.value).toEqual([])
	expect(root.map.size).toEqual(0)

	// Undoing another time should not be an error
	stack.undo()

	// Wind it forwards again
	stack.redo()
	expect(stack.stack.length).toEqual(3)
	expect(stack.canUndo.value).toEqual(true)
	expect(stack.canRedo.value).toEqual(true)
	expect(stack.index).toEqual(0)

	expect(root.text.value).toEqual('Some new text')
	expect(root.list.value).toEqual([])
	expect(root.map.size).toEqual(0)

	stack.redo()
	expect(stack.stack.length).toEqual(3)
	expect(stack.canUndo.value).toEqual(true)
	expect(stack.canRedo.value).toEqual(true)
	expect(stack.index).toEqual(1)

	expect(root.text.value).toEqual('Some new text')
	expect(root.list.value).toEqual(['First'])
	expect(root.map.size).toEqual(0)

	stack.redo()
	expect(stack.stack.length).toEqual(3)
	expect(stack.canUndo.value).toEqual(true)
	expect(stack.canRedo.value).toEqual(false)
	expect(stack.index).toEqual(2)

	expect(root.text.value).toEqual('Some new text')
	expect(root.list.value).toEqual(['First'])
	expect(root.map.size).toEqual(1)
	expect(root.map.get('foo')).toEqual('bar')

	// Redoing another time should not be an error
	stack.redo()
})

test('Nested undo uperations', () => {
	const root = new RootStore()
	const stack = new StoreUndoStack(root)

	root.child.text.set('Nested text')

	expect(stack.stack.length).toEqual(1)

	stack.undo()
	expect(root.child.text.value).toEqual('initial')

	stack.redo()
	expect(root.child.text.value).toEqual('Nested text')
})

test('Grouped undo operations', () => {
	const root = new RootStore()
	const stack = new StoreUndoStack(root)

	stack.withUndoGroup(() => {
		root.text.set('An initial edit')

		root.list.add('One')
		root.list.add('Two')
		root.list.insert(1, '1.5')

		root.text.set('A final edit')
	})

	expect(stack.stack.length).toEqual(1)

	stack.undo()
	expect(root.text.value).toEqual('initial')
	expect(root.list.value).toEqual([])

	stack.redo()
	expect(root.text.value).toEqual('A final edit')
	expect(root.list.value).toEqual(['One', '1.5', 'Two'])

	stack.withUndoGroup(() => {
		root.list.splice(1, 2, 'Hello', 'there')
		root.list.splice(0, 1)
	})

	expect(root.list.value).toEqual(['Hello', 'there'])

	stack.undo()
	expect(root.list.value).toEqual(['One', '1.5', 'Two'])

	stack.redo()
	expect(root.list.value).toEqual(['Hello', 'there'])
})

test('Nested undo groups', () => {
	const root = new RootStore()
	const stack = new StoreUndoStack(root)

	stack.withUndoGroup(() => {
		root.text.set('I am a fancy panda')
		stack.withUndoGroup(() => {
			root.text.set('I am a pretty mermaid')
			root.text.set('Now I have legs!')
		})
		root.text.set('Yeah, nevermind')
	})

	expect(root.text.value).toEqual('Yeah, nevermind')
	expect(stack.stack.length).toEqual(1)

	stack.undo()
	expect(root.text.value).toEqual('initial')

	stack.redo()
	expect(root.text.value).toEqual('Yeah, nevermind')
})

test('Collapsing into undo groups', () => {
	const root = new RootStore()
	const stack = new StoreUndoStack(root)

	root.text.set('First')
	stack.collapseIntoPreviousGroup(() => {
		root.text.set('Second')
	})

	expect(stack.stack.length).toEqual(1)

	stack.undo()
	expect(root.text.value).toEqual('initial')

	stack.redo()
	expect(root.text.value).toEqual('Second')
})

test('Max undo stack', () => {
	const root = new RootStore()
	const stack = new StoreUndoStack(root, {
		maximumSize: 4
	})

	root.text.set('One')
	root.text.set('Two')
	root.text.set('Three')
	root.text.set('Four')
	root.text.set('Five')

	while (stack.canUndo.value) {
		stack.undo()
	}

	expect(stack.stack.length).toEqual(4)
	expect(root.text.value).toEqual('One')
})
