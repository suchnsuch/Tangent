import * as paths from '../paths'

import { SelfStore } from 'common/stores'

import { forAllNodes, integrateTrees, iterateOverChildren, TreeNode, TreePredicate, TreePredicateResult } from './directory'
import { bestMatchForSearch, buildMatcher, nodeSearchResults, PathMatch, SegmentSearchNodePair, SearchMatchResult, isSearchArray } from '../search'

interface GetMatches_Base {
	/** The node to look under */
	root?: TreeNode
	/** The nodes to look under */
	roots?: TreeNode[]
	/** The node from which to consider "closest" values */
	origin?: TreeNode
	
	/**
	 * If true, search will be more permissive
	 */
	fuzzy?: boolean

	/**
	 * If true, only the results with the lowest distance will be returned
	 * Incompatible with `orderByDistance`
	 */
	bestOnly?: boolean

	/**
	 * If true, results will be ordered with lowest distance first
	 * Incompatible with `bestOnly`
	 */
	orderByDistance?: boolean

	/**
	 * If present, all nodes must pass this test to be included
	 */
	filter?: TreePredicate
}

interface GetMatches_Matches {
	includeMatches: 'all' | 'best'
}

interface GetMatches_Array {
	alwaysReturnArray: true
}

type GetMatches_Internal = GetMatches_Base & Partial<GetMatches_Matches>
type GetMatchesOptions = GetMatches_Internal & Partial<GetMatches_Array>

interface getPathOptions {
	/**
	 * The node from wich to consider "closest" values
	 */
	// TODO: Actually support this
	origin?: TreeNode,
	root?: TreeNode,

	length?: 'full' | 'short' | 'shortest'

	includeExtension?: boolean | ((extension: string) => boolean)
}

export enum DirectoryStoreAddResult {
	Success = 1,
	PathAlreadyExists = -1,
	PathNotInRoot = -2,
	NoParentFound = -3
}

export namespace DirectoryStoreAddResult {
	export function describe(result: DirectoryStoreAddResult) {
		switch(result) {
			case DirectoryStoreAddResult.Success:
				return 'Success'
			case DirectoryStoreAddResult.PathAlreadyExists:
				return 'Node path already present in store'
			case DirectoryStoreAddResult.PathNotInRoot:
				return 'Node path not child of store root'
			case DirectoryStoreAddResult.NoParentFound:
				return 'No parent found for node'
		}
	}
}

export function defaultStoreFilter(node: TreeNode): TreePredicateResult {
	if (node.name.startsWith('.')) return TreePredicateResult.Ignore
	return TreePredicateResult.Include
}

/**
 * A DirectoryLookup is the core interface for translating tree nodes
 * to and from raw/portable path strings.
 */
export interface DirectoryLookup {
	get(path: string): TreeNode
	getWithPortablePath(portablePath: string): TreeNode
	portablePathToPath(portablePath: string): string
	pathToPortablePath(workspacePath: string): string

	getParent(path: string | TreeNode): TreeNode

	// This is 100% a leak from the requirements of the TangentMap
	// This kind of functionaliy (and the getMatches() functions)
	// could totally be turned into statics that take a DirectoryLookup.
	isParentOf(maybeParent: TreeNode, maybeChild: TreeNode): boolean
}

export default class DirectoryStore extends SelfStore implements DirectoryLookup {

	private roots: TreeNode[]
	private lookup: Map<string, TreeNode>
	private parentLookup: Map<string, TreeNode>

	caseSensitive = true

	constructor(trees: TreeNode | TreeNode[]) {
		super()

		if (!trees) {
			throw new Error('Directory tree cannot be nullish!')
		}

		this.nodeIncorporator = this.nodeIncorporator.bind(this)

		if (!Array.isArray(trees)) {
			trees = [trees]
		}

		this.roots = trees
		this.lookup = new Map()
		this.parentLookup = new Map()

		// Define and fill the lookup
		for (const tree of trees) {
			this.lookup.set(tree.path, tree)
			forAllNodes(tree, this.nodeIncorporator)	
		}
	}

	*allContents(predicate?: TreePredicate) {
		for (const root of this.roots) {
			yield* iterateOverChildren(root, predicate)
		}
	}

	has(node: TreeNode | string): boolean {
		if (typeof node === 'string') {
			return this.lookup.has(node)
		}
		return this.lookup.get(node.path) === node
	}

	get(path: string): TreeNode {
		return this.lookup.get(path)
	}
	
	getWithPortablePath(portablePath: string): TreeNode {
		try {
			return this.get(this.portablePathToPath(portablePath))
		}
		catch (e) {
			console.error('Could not convert portable path', portablePath, e)
			return null
		}
	}

	getParent(path: string | TreeNode) {
		if (typeof path !== 'string') {
			path = path.path
		}
		return this.parentLookup.get(path)
	}

	getRoot(node: TreeNode): TreeNode
	getRoot(index: number): TreeNode
	getRoot(nodeOrIndex: TreeNode | number): TreeNode {
		if (typeof nodeOrIndex === 'number') {
			return this.roots[nodeOrIndex]
		}
		let parent = nodeOrIndex
		do {
			nodeOrIndex = parent
			parent = this.getParent(nodeOrIndex)
		} while (parent)
		return nodeOrIndex
	}

	/**
	 * Transforms a full path into a path without its root information
	 */
	pathToRelativePath(workspacePath: string) {
		for (const root of this.roots) {
			const result = paths.getChildPath(root.path, workspacePath)
			if (result !== false) return result
		}
		return false
	}

	/**
	 * Transforms a full path into a path that can be resolved even if this directory were to move.
	 */
	pathToPortablePath(workspacePath: string): string {
		throw new Error('DirectoryStore cannot create a portable path on its own.')
	}

	/**
	 * Transforms a portable path into a full path
	 */
	portablePathToPath(portablPath: string): string {
		throw new Error('DirectoryStore cannot resolve a portable path on its own.')
	}

	/**
	 * Gets a full workspace path from a string, which may be a portable path
	 */
	unknownStringToPath(maybePortablePath: string): string {
		throw new Error('DirectoryStore cannot resolve a portable path on its own.')
	}

	add(node: TreeNode): DirectoryStoreAddResult {
		if (this.lookup.has(node.path)) {
			return DirectoryStoreAddResult.PathAlreadyExists
		}
		for (const root of this.roots) {
			const childPath = paths.getChildPath(root.path, node.path)
			if (childPath) {
				const dirname = paths.dirname(childPath)
				const parentPath = paths.join(root.path, dirname)

				const parent = this.lookup.get(parentPath)
				if (parent) {
					if (!parent.children) parent.children = []
					parent.children.push(node)

					forAllNodes(node, this.nodeIncorporator, parent)

					return DirectoryStoreAddResult.Success
				}
				return DirectoryStoreAddResult.NoParentFound
			}
		}
		return DirectoryStoreAddResult.PathNotInRoot
	}

	private nodeIncorporator(child: TreeNode, parent: TreeNode) {
		this.lookup.set(child.path, child)
		this.parentLookup.set(child.path, parent)
		child.depth = parent ? parent.depth + 1 : 0
	}

	integrate(incomingTree: TreeNode, integrator: (existingNode:TreeNode, incomingNode:TreeNode) => TreeNode): TreeNode {
		let existingTree = this.get(incomingTree.path)
		if (existingTree) {
			this.remove(existingTree)
		}

		let newTree = integrateTrees(existingTree, incomingTree, integrator)

		if (newTree) {
			this.add(newTree)
		}
		return newTree
	}

	remove(node: string | TreeNode): TreeNode {
		if (typeof node === 'string') {
			node = this.lookup.get(node)
			if (!node) {
				return
			}
		}
		const parent = this.parentLookup.get(node.path)
		if (parent && parent.children) {
			const index = parent.children.indexOf(node)
			if (index >= 0) {
				parent.children.splice(index, 1)
				this.lookup.delete(node.path)
				this.parentLookup.delete(node.path)

				// Remove children
				if (node.children) {
					for (let child of iterateOverChildren(node)) {
						this.lookup.delete(child.path)
						this.parentLookup.delete(child.path)
					}
				}
				return node
			}
		}
		return
	}

	/**
	 * Considers each descendent, depth-first, calling the removal predicate on each.
	 * If the predicate returns true, the node is removed.
	 * Nodes who's children were not completely removed are not removed or considered by the predicate.
	 * @param node The node to start with
	 * @param removalPredicate A function to determine if a node should be removed
	 * @param parent If present, assumes the parent will take care of removing this node
	 * @param removed If present, will fill with the removed nodes.
	 * @returns Whether or not `node` was removed
	 */
	conditionallyRemove(
		node: TreeNode,
		removalPredicate: (node: TreeNode) => boolean,
		parent?: TreeNode,
		removed?: TreeNode[])
		: boolean
	{
		if (node.children) {
			for (let i = 0; i < node.children.length; i++) {
				const child = node.children[i]
				if (this.conditionallyRemove(child, removalPredicate, node, removed)) {
					node.children.splice(i, 1)
					i--
					this.lookup.delete(child.path)
					this.parentLookup.delete(child.path)
					if (removed) {
						removed.push(child)
					}
				}
			}
			if (node.children.length > 0) {
				// Don't want to remove nodes that haven't changed
				return false
			}
		}

		const removalResult = removalPredicate(node)

		if (!parent && removalResult) {
			this.remove(node)
			if (removed) {
				removed.push(node)
			}
		}
		return removalResult
	}

	isParentOf(maybeParent: TreeNode, maybeChild: TreeNode) {
		let walkingNode = maybeChild
		while (walkingNode && walkingNode !== maybeParent) {
			walkingNode = this.getParent(walkingNode)
		}
		return walkingNode != undefined
	}

	/**
	 * Returns the number of steps between Node A and Node B
	 * Distance is the number of steps needed until you have the same _parent_
	 * Thus, children of the same folder have a distance of 0
	 */
	getDistanceBetween(nodeA: TreeNode, nodeB: TreeNode): { ancestor: TreeNode, distance: number } {
		let walkingA = nodeA
		let walkingB = nodeB

		let distance = 0

		// Find and equalize depths
		let commonDepth = Math.min(nodeA.depth, nodeB.depth)
		while (walkingA.depth > commonDepth) {
			walkingA = this.getParent(walkingA)
			distance++
		}
		while (walkingB.depth > commonDepth) {
			walkingB = this.getParent(walkingB)
			distance++
		}

		// Walk up the tree together to find the common ancestor
		if (walkingA !== walkingB) {
			while (walkingA && walkingB && walkingA !== walkingB) {
				walkingA = this.getParent(walkingA)
				walkingB = this.getParent(walkingB)
	
				// Both had to move, 
				distance += 2
			}
			// First step doesn't count
			distance -= 2
		}

		if (walkingA !== walkingB) {
			return {
				ancestor: null,
				distance
			}
		}

		return {
			ancestor: walkingA,
			distance
		}
	}

	private getRootsForOptions(options: GetMatches_Base): TreeNode[] {
		if (options.roots) return options.roots
		if (options.root) return [options.root]
		if (options.origin) return [this.getRoot(options.origin)]
		return this.roots
	}

	getMatchesForPath(pathMatch: string | PathMatch, options?: GetMatches_Base): TreeNode | TreeNode[]
	getMatchesForPath(pathMatch: string | PathMatch, options?: GetMatches_Base & GetMatches_Array): TreeNode[]
	getMatchesForPath(pathMatch: string | PathMatch, options?: GetMatches_Base & GetMatches_Matches): SegmentSearchNodePair | SegmentSearchNodePair[]
	getMatchesForPath(pathMatch: string | PathMatch, options?: GetMatches_Base & GetMatches_Matches & GetMatches_Array): SegmentSearchNodePair[]
	getMatchesForPath(pathMatch: string | PathMatch, options?: GetMatchesOptions): TreeNode | TreeNode[] | SegmentSearchNodePair | SegmentSearchNodePair[] {
		options = options ?? {}

		const roots = this.getRootsForOptions(options)

		let result: TreeNode[] = []

		if (typeof pathMatch === 'string') {
			pathMatch = buildMatcher(pathMatch, { ...options, caseSensitive: this.caseSensitive })
		}

		let origin = options.origin ?? roots[0]
		if (origin.children === undefined) {
			origin = this.getParent(origin) // Why?
		}

		for (const root of roots) {
			this._getMatches(pathMatch, root, root, result, options)
		}

		if (options.bestOnly && result.length > 1) {
			let lowestDistance = Number.POSITIVE_INFINITY

			let annotatedResult = result.map(item => {
				let details = this.getDistanceBetween(item, origin)
				if (lowestDistance > details.distance) {
					lowestDistance = details.distance
				}
				return {
					item,
					distance: details.distance
				}
			})

			result = []

			for (let item of annotatedResult) {
				if (item.distance === lowestDistance) {
					result.push(item.item)
				}
			}

			if (result.length === 2) {
				// When a link resolves to a file and a note with the same name at the same
				// level, prefer the file over the folder.
				// A way for a note to also be a namespace.
				// Original Request: https://github.com/suchnsuch/Tangent/issues/115
				const a = result[0]
				const b = result[1]
				if (a.name === b.name && ((a.fileType === 'folder') !== (b.fileType === 'folder'))) {
					result = result.filter(r => r.fileType !== 'folder')
				}
			}
		}
		else if (options.orderByDistance && result.length > 1) {
			// Annotate the result so that distance is calculated once
			let annotatedResult = result.map(item => {
				return {
					item,
					distance: this.getDistanceBetween(item, origin).distance
				}
			})

			// Sort the annotated list
			annotatedResult.sort((a, b) => {
				return a.distance - b.distance
			})

			// Remap the result
			result = annotatedResult.map(i => i.item)
		}

		if (options.alwaysReturnArray) {
			return result
		} 
		return result.length === 1 ? result[0] : result
	}

	private _getMatches(
		pathMatch: PathMatch,
		root: TreeNode,
		origin: TreeNode,
		result: (TreeNode|SegmentSearchNodePair)[],
		options: GetMatches_Internal)
	{
		for (let child of origin.children) {
			let approved: boolean | TreeNode | SegmentSearchNodePair | SegmentSearchNodePair[] = false
			
			const filterResult = options.filter ? options.filter(child) : defaultStoreFilter(child)
			if (filterResult === false || filterResult === TreePredicateResult.Ignore) {
				continue
			}

			if (options.includeMatches === 'all') {
				const results = nodeSearchResults(child, pathMatch, root)
				if (isSearchArray(results)) {
					for (const match of results) {
						if (match) {
							if (!approved) approved = []
							approved.push({ node: child, match })
						}
					}
				}
				else if (results) {
					if (!approved) approved = []
					approved.push({ node: child, match: results })
				}
				
			}
			else {
				const match = bestMatchForSearch(child, pathMatch, root)
				if (match) {
					if (options.includeMatches === 'best') {
						approved = {
							node: child,
							match
						}
					}
					else {
						approved = child
					}
				}
			}

			if (approved) {
				if (filterResult !== TreePredicateResult.OnlyIncludeChildren) {
					// This node was approved. Append the results.
					if (Array.isArray(approved)) {
						for (const item of approved) {
							result.push(item)
						}
					}
					else {
						result.push(approved)
					}
				}
				if (child.children && filterResult !== TreePredicateResult.IncludeWithoutChildren) {
					// Continue looking within children for more matches
					this._getMatches(pathMatch, root, child, result, options)
				}
			}
			else if (child.children && filterResult !== TreePredicateResult.IncludeWithoutChildren) {
				// Didn't match, continue looking within children
				this._getMatches(pathMatch, root, child, result, options)
			}
		}
	}

	getPathToItem(target: TreeNode, options?: getPathOptions): string {
		// This is the slowest way to do this,
		// but this is not a function intended to be run all the time

		options = options || {}

		let path = target.name
		const includeExtension = options.includeExtension ?? true
		if (target.fileType !== 'folder' && (
				(typeof includeExtension === 'boolean' && includeExtension) ||
				(typeof includeExtension === 'function' && includeExtension(target.fileType) === true)
			)
		) {
			path += target.fileType
		}

		let length = options.length || 'full'
		const root = this.getRoot(target)

		let walker = this.getParent(target)
		while (walker && walker !== root) {
			if (length !== 'full') {
				const result = this.getMatchesForPath(path, {
					root: options.root ?? root,
					bestOnly: true
				})
				if (result === target) break
			}

			path = walker.name + '/' + path
			walker = this.getParent(walker)
		}

		return path
	}

	getUniquePath(idealPath: string) {
		let path = idealPath
		if (this.get(path)) {
			const dir = paths.dirname(idealPath)
			const extension = paths.extname(idealPath)
			let baseName = paths.basename(idealPath, extension)
			let number = 1

			// Capture existing numbers in "foo 3" filenames
			const numberMatch = baseName.match(/ \d+$/)
			if (numberMatch) {
				number = parseInt(numberMatch[0]) + 1
				baseName = baseName.substring(0, baseName.length - numberMatch[0].length)
			}

			do {
				path = paths.join(dir, `${baseName} ${number}${extension}`)
				number++
			}
			while (this.get(path))
		}
		
		return path
	}
}
