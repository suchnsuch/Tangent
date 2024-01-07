import type { TreeNode, DirectoryLookup } from 'common/trees'
import { PatchableStore, PatchableMap, PatchableMapPatchType } from 'common/stores'
import MapNode, { MapStrength } from './MapNode'
import Logger from 'js-logger'

const log = Logger.get('TangentMap')

export interface MapNodeCreationOptions {
	isRoot?: boolean,
	strength?: MapStrength,
	dateCreated?: Date
}

export class MapNodeStore extends PatchableMap<TreeNode, MapNode, any> {

	directory: DirectoryLookup

	constructor(directory: DirectoryLookup) {
		super(null, {
			observeItems: true
		})

		this.directory = directory
	}

	getOrCreate(node: TreeNode, options?: MapNodeCreationOptions) {
		if (!node) {
			console.error('Attempted to get or create a map node with a bad tree node')
			return
		}
		const existing = this.get(node)
		if (existing) return existing

		const newNode = new MapNode(this.directory, options)
		newNode.node.value = node
		this.set(node, newNode)
		return newNode
	}

	applyPatch(patch) {
		const changed = super.applyPatch(patch)
		// Applying patches calls `convertPatchValueToValue()`
		// In order to defer processing until all nodes are in the map,
		// Nodes created in this way need to be initialized after the fact.
		// TODO: This could be faster
		for (const [key, node] of this._value.entries()) {
			if (!node.node.value && key) {
				console.warn('Restoring map node to ', key.path, 'from', node.getRawValues(), 'after', patch)
				// Attempt to restore a null node reference
				node.node.set(key)
			}
		}
		return changed
	}

	// The current path is used because this is called _after_ the rename has been processed
	notifyNodeReplaced(newPath: string, oldPath: string) {
		if (newPath === oldPath) return // This will resolve to the same node; do nothing

		const newNode = this.directory.get(newPath)
		if (!newNode) {
			console.error('Cannot replace to a node that does not exist', newPath)
		}

		const newMapNode = this.getOrCreate(newNode)

		for (const node of this.values()) {
			if (node.node.value?.path === oldPath) {
				// Give the old strength to the new node
				newMapNode.strength.add(node.strength.value)
			}
		}
	}

	protected convertKeyToPatch(key: TreeNode) {
		return this.directory.pathToPortablePath(key?.path)
	}

	convertPatchKeyToKey(patchKey: string) {
		const node = this.directory.getWithPortablePath(patchKey)

		if (!node) {
			// Fall back to just looking for the right node in the store
			const fullPath = this.directory.portablePathToPath(patchKey)
			for (const key of this.keys()) {
				if (key.path === fullPath) return key
			}
		}
		
		return node
	}

	protected convertValueToPatch(mapNode: MapNode) {
		return mapNode.getRawValues()
	}

	protected convertPatchValueToValue(patch) {
		return new MapNode(this.directory, patch)
	}
}

export class MapNodeReference extends PatchableStore<MapNode, string> {
	sourceStore: MapNodeStore

	constructor(sourceStore: MapNodeStore, initialValue?: MapNode) {
		super(initialValue)
		this.sourceStore = sourceStore
	}

	protected convertFromPatch(path: string) {
		const treeNode = this.sourceStore.convertPatchKeyToKey(path)
		if (!treeNode) {
			log.warn('MapNodeReference could not find a tree node with:', path)
			return
		}

		const mapNode = this.sourceStore.get(treeNode)
		if (!mapNode) {
			log.warn('MapNodeReference could not find a map node with:', treeNode)
		}

		return mapNode
	}

	protected convertToPatch(node: MapNode) {
		return this.sourceStore.directory.pathToPortablePath(node?.node?.value?.path)
	}
}
