import type { TreeNode } from './directory'
import { PatchableStore, PatchableList, PatchableListOptions } from '../stores'
import type { DirectoryLookup } from './directoryStore';

export class TreeItemReference<T extends TreeNode> extends PatchableStore<T, string> {

	directory: DirectoryLookup

	constructor(directory: DirectoryLookup, initialValue?: T) {
		super(initialValue || null)

		this.directory = directory
	}

	protected convertToPatch(value) {
		const p = value?.path
		return p ? this.directory.pathToPortablePath(p) : null
	}

	protected convertFromPatch(path) {
		return this.directory.getWithPortablePath(path) as T
	}
}

export class TreeItemListReference<T extends TreeNode> extends PatchableList<T, string> {

	directory: DirectoryLookup

	constructor(directory: DirectoryLookup, initialValue?: T[], options?: PatchableListOptions) {
		super(initialValue || [], options)
		this.directory = directory
	}

	protected convertToPatchItem = (node: T) => {
		const p = node?.path
		return p ? this.directory.pathToPortablePath(p) : null
	}

	protected convertFromPatchItem = (path: string) => {
		return this.directory.getWithPortablePath(path) as T
	}
}

export class TreeItemSetReference<T extends TreeNode> extends PatchableStore<Set<T>, string[]> {
	directory: DirectoryLookup

	constructor(directory: DirectoryLookup, initialValue?: T[]) {
		super(new Set(initialValue))

		this.directory = directory
	}

	protected convertFromPatch(pathList: string[]) {
		const result: Set<T> = new Set()

		let cleaned = false
		
		if (Array.isArray(pathList)) {
			for (const path of pathList) {
				const node = this.directory.getWithPortablePath(path) as T
				if (node) {
					result.add(node)
				}
				else {
					cleaned = true
				}
			}
		}
		
		if (cleaned) {
			this.publishPatch(this.convertToPatch(result), null)
		}

		return result
	}

	protected convertToPatch(nodes: Set<T>) {
		let result: string[] = []
		for (const node of nodes) {
			result.push(this.directory.pathToPortablePath(node.path))
		}
		return result
	}

	has(value: T) {
		return this.value?.has(value)
	}

	add(value: T) {
		this.value.add(value)
		this.onValueChanged(this.value)
	}

	delete(value: T) {
		this.value.delete(value)
		this.onValueChanged(this.value)
	}
}
