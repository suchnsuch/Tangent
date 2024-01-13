import type { ObjectStore } from './ObjectStore'
import { WritableStore } from './WritableStore'

interface UndoItem {
	undo(root: ObjectStore)
	redo(root: ObjectStore)
}

class UndoGroup implements UndoItem {
	items: UndoItem[] = []

	undo(root) {
		for (let i = this.items.length - 1; i >= 0; i--) {
			this.items[i].undo(root)
		}
	}
	
	redo(root) {
		for (const item of this.items) {
			item.redo(root)
		}
	}
}

class PatchItem implements UndoItem {
	patch: any
	reverse: any

	constructor(patch, reverse) {
		this.patch = patch
		this.reverse = reverse
	}

	undo(root: ObjectStore) {
		root.applyPatch(this.reverse, true)
	}

	redo(root: ObjectStore) {
		root.applyPatch(this.patch, true)
	}
}

export interface StoreUndoStackOptions {
	maximumSize?: number,
	ignoredKeys?: Set<string>
}

const defaultUndoStackOptions: StoreUndoStackOptions = {
	maximumSize: 30
}

export class StoreUndoStack {
	root: ObjectStore
	options: StoreUndoStackOptions

	stack: UndoItem[] = []
	index: number = -1

	canUndo: WritableStore<boolean> = new WritableStore(false)
	canRedo: WritableStore<boolean> = new WritableStore(false)

	private callbacks: (() => void)[] = []

	protected openGroup: UndoGroup = null
	protected groupDepth: number = 0
	protected isUnReDoing = false

	constructor(root: ObjectStore, options?: StoreUndoStackOptions) {
		this.root = root
		this.options = {
			...defaultUndoStackOptions,
			...(options || {})
		}
		root.observePatch((p, r) => this.onRootPatch(p, r))
	}

	protected onRootPatch(patch: any, reverse: any) {
		if (this.isUnReDoing || !reverse) return

		if (this.options.ignoredKeys) {
			const keys = Object.keys(patch)
			if (keys.find(k => this.options.ignoredKeys.has(k))) {

				if (keys.length === 1) return // No need for further action

				let filteredPatch = {} as any
				let filteredReverse = {} as any
				for (const key of keys) {
					if (!this.options.ignoredKeys.has(key)) {
						filteredPatch[key] = patch[key]
						filteredReverse[key] = patch[key]
					}
				}

				patch = filteredPatch
				reverse = filteredReverse
			}
		}
		
		const patchItem = new PatchItem(patch, reverse)

		if (this.openGroup) {
			this.openGroup.items.push(patchItem)
		}
		else {
			this.pushUndoItem(patchItem)
		}
	}

	protected pushUndoItem(item: UndoItem) {
		const delta = this.stack.length - this.index
		if (delta > 1) {
			this.stack.splice(this.index + 1, delta - 1, item)
		}
		else {
			this.stack.push(item)
		}
		const maxDelta = this.stack.length - this.options.maximumSize
		if (maxDelta > 0) {
			this.stack.splice(0, maxDelta)
			this.index = this.stack.length - 1
		}
		else {
			this.index++
		}
		this.updateCanUnReDo()
	}

	protected updateCanUnReDo() {
		this.canUndo.set(this.index >= 0)
		this.canRedo.set(this.stack.length > 0 && this.index < this.stack.length - 1)
	}

	undo() {
		if (this.index >= 0) {
			this.isUnReDoing = true
			this.stack[this.index].undo(this.root)
			this.isUnReDoing = false
			this.index--
			this.updateCanUnReDo()

			for (const callback of this.callbacks) {
				callback()
			}
		}
	}

	redo() {
		if (this.stack.length > 0 && this.index < this.stack.length - 1) {
			this.isUnReDoing = true
			this.index++
			this.stack[this.index].redo(this.root)
			this.isUnReDoing = false
			this.updateCanUnReDo()

			for (const callback of this.callbacks) {
				callback()
			}
		}
	}

	withUndoGroup(action: () => void) {
		this.pushUndoGroup()
		try {
			action()
			this.popUndoGroup()
		}
		catch(e) {
			this.popUndoGroup()
			throw e
		}
	}

	collapseIntoPreviousGroup(action: () => void) {
		if (this.groupDepth) {
			return this.withUndoGroup(action)
		}

		if (this.stack.length === 0) {
			// No undo for you
			this.isUnReDoing = true
			try {
				action()
				this.isUnReDoing = false
			}
			catch (e) {
				this.isUnReDoing = false
			}
			return
		}

		// Ensure the current item is an undo group
		let group: UndoGroup = null
		let currentItem = this.stack[this.index]
		if (currentItem instanceof UndoGroup) {
			group = currentItem
		}
		else {
			group = new UndoGroup()
			group.items.push(currentItem)
			this.stack[this.index] = group
		}

		this.openGroup = group

		try {
			action()
			this.openGroup = null
		}
		catch (e) {
			this.openGroup = null
			throw e
		}
	}

	clear() {
		this.stack = []
		this.index = -1
	}

	registerUndoRedoCallback(callback: () => void) {
		this.callbacks.push(callback)
	}

	protected pushUndoGroup() {
		if (!this.openGroup) {
			this.openGroup = new UndoGroup()
		}
		this.groupDepth++
	}

	protected popUndoGroup() {
		if (this.groupDepth <= 0) {
			console.error('Tried to pop an undo group when no group was open')
			return
		}
		this.groupDepth--
		if (this.groupDepth === 0) {
			if (this.openGroup.items.length) {
				// No need to push an empty group
				this.pushUndoItem(this.openGroup)
			}
			this.openGroup = null
		}
	}
}
