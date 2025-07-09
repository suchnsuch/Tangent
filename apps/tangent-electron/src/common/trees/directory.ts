import type { IndexData } from "../indexing/indexTypes"
import paths from '../paths'

export interface TreeNode {
	path: string,
	name: string,
	fileType: string,
	depth?: number,
	children?: TreeNode[],

	created?: Date,
	modified?: Date,
	
	meta?: IndexData,

	createShallowCopy?(): TreeNode
}

export interface TreeChange {
	added?: TreeNode[],
	removed?: string[],
	changed?: TreeNode[],
	moved?: TreeChangeMovedItem[],
	replaced?: TreeChangeReplacedItem[]
}

// Represents a node being renamed as something else
export interface TreeChangeMovedItem {
	oldPath: string
	node: TreeNode
}

// Represents a node being _replaced_ as something else.
// e.g. a virtual node being superseded by another node with a different path.
// This should coincide with add & delete messages for these nodes as well.
export interface TreeChangeReplacedItem {
	oldPath: string
	newPath: string
}

export enum TreePredicateResult {
	Ignore,
	Include,
	IncludeWithoutChildren,
	OnlyIncludeChildren
}

export type TreePredicate = (item: TreeNode) => TreePredicateResult | boolean

export function* allChangedPaths(change: TreeChange) {
	if (change.added) {
		for (const added of change.added) {
			yield added.path
		}
	}
	if (change.removed) {
		for (const removed of change.removed) {
			yield removed
		}
	}
	if (change.changed) {
		for (const changed of change.changed) {
			yield changed.path
		}
	}
	if (change.moved) {
		for (const moved of change.moved) {
			yield moved.node.path
			yield moved.oldPath
		}
	}
	if (change.removed) {
		for (const removed of change.removed) {
			yield removed
		}
	}
}

/**
 * Gives a decent guess at the nature of a tree node from a path
 */
export function nodeFromPath(path: string): TreeNode {
	const extension = paths.extname(path)
	const name = paths.basename(path, extension)

	return {
		path,
		name,
		fileType: extension ?? 'folder'
	}
}

export function* iterateOverChildren(directory: TreeNode, predicate?: TreePredicate): Generator<TreeNode> {
	for (let child of directory.children) {
		const result = predicate ? predicate(child) : TreePredicateResult.Include
		if (result === false || result === TreePredicateResult.Ignore)
			continue

		if (result !== TreePredicateResult.OnlyIncludeChildren) {	
			yield child
		}

		if (child.children && result !== TreePredicateResult.IncludeWithoutChildren) {
			yield* iterateOverChildren(child, predicate)
		}
	}
}

export function* iterateOverSortedChildren(
	node: TreeNode,
	sorter: (a: TreeNode, b: TreeNode) => number,
	predicate?: TreePredicate)
	: Generator<TreeNode>
{
	let sortedChildren = node.children.slice()
	sortedChildren.sort(sorter)
	
	for (let child of sortedChildren) {
		const result = predicate ? predicate(child) : TreePredicateResult.Include
		if (result === false || result === TreePredicateResult.Ignore)
			continue
		
		if (result !== TreePredicateResult.OnlyIncludeChildren) {	
			yield child
		}

		if (child.children && result !== TreePredicateResult.IncludeWithoutChildren) {
			yield* iterateOverSortedChildren(child, sorter, predicate)
		}
	}
}

/**
 * Calls a function on a node, and any of its descendents
 * @param rootNode The node to start from
 * @param func The function that will be called on each node. Includes the child's parent.
 * 				Return `false` (exactly) from this function to skip that node's children
 * 				Return `true` (exactly) to early out, like a break
 */
export function forAllNodes(rootNode: TreeNode, func: (node: TreeNode, parent?: TreeNode) => any, parent?: TreeNode) {
	let result = func(rootNode, parent)
	if (result === true) {
		// Early out
		return true
	}
	if (result !== false && rootNode.children) {
		for (let child of rootNode.children) {
			result = forAllNodes(child, func, rootNode)
			if (result) {
				// Early out
				return true
			}
		}
	}
}

export function mapTree(node: TreeNode, func: (item: TreeNode) => TreeNode) {
	let newChildren: TreeNode[] = null

	let newNode = func(node)

	if (newNode && node.children) {
		newChildren = []
		for (let child of node.children) {
			let newChild = mapTree(child, func)
	
			if (newChild) {
				newChildren.push(newChild)
			}
		}
	}
	
	if (newChildren) {
		newNode.children = newChildren
	}

	return newNode
}

export function shallowCopyTreeNodeWithoutChildren(treeNode: TreeNode, allowImplementation=true): TreeNode {
	if (allowImplementation && treeNode.createShallowCopy)
		return treeNode.createShallowCopy()
	
	const result: TreeNode = {
		name: treeNode.name,
		path: treeNode.path,
		fileType: treeNode.fileType,
		depth: treeNode.depth,
		created: treeNode.created,
		modified: treeNode.modified,
		meta: treeNode.meta
	}
	return result
}

export function integrateTrees(
	treeA: TreeNode,
	treeB: TreeNode,
	integrator: (nodeA: TreeNode, nodeB: TreeNode) => TreeNode
	): TreeNode 
{
	let newChildren: TreeNode[] = null
	if (treeA && treeA.children || treeB && treeB.children) {
		newChildren = []

		let treeBChildLookup = new Map<string, TreeNode>()
		if (treeB && treeB.children) {
			for (let child of treeB.children) {
				treeBChildLookup.set(child.path, child)
			}
		}
		
		if (treeA && treeA.children) {
			for (let childA of treeA.children) {
				let childB = treeBChildLookup.get(childA.path)
				if (childB) {
					treeBChildLookup.delete(childB.path)
				}

				let newChild = integrateTrees(childA, childB, integrator)
				if (newChild) {
					newChildren.push(newChild)
				}
			}
		}

		for (let childB of treeBChildLookup.values()) {
			let newChild = integrateTrees(null, childB, integrator)
			if (newChild) {
				newChildren.push(newChild)
			}
		}
	}

	let newNode = integrator(treeA, treeB)
	if (newNode && newChildren !== null) {
		newNode.children = newChildren
	}
	return newNode
}

export function moveTree(node: TreeNode, newPath: string): TreeChangeMovedItem[] {
	const moved: TreeChangeMovedItem[] = []

	const oldParentPath = node.path
	forAllNodes(node, (n, p) => {
		const oldPath = n.path
		n.path = n.path.replace(oldParentPath, newPath)
		const extension = paths.extname(n.path)
		n.name = paths.basename(n.path, extension)
		if (extension) {
			n.fileType = extension
		}

		moved.push({
			oldPath,
			node: shallowCopyTreeNodeWithoutChildren(n)
		})
	})

	return moved
}

export type PathValidationMessages = ({
	level: 'error'|'warning'|'info',
	message: string
})[]

// Windows is the largest offender here, with very limited valid characters
// Values sourced from: https://stackoverflow.com/questions/1976007/what-characters-are-forbidden-in-windows-and-linux-directory-names#31976060
// additionally stripping out newlines
const illegalCharacterToBlankMatch = /[<>:"?*]+/g
const illegalCharacterToSpaceMatch = /[\/\\\|\n\r]+/g
const endingCharacterMatch = /[\. ]$/
const reservedNames = /^(CON|PRN|AUX|NUL|COM\d|LPT\d)(\..*)?$/i
export function validateFileSegment(segment: string, messages?: PathValidationMessages): string | false {
	if (segment === null || segment === undefined) {
		messages?.push({
			level: 'error',
			message: 'Invalid Path Segment'
		})
		return false
	}

	const cleanedBlankChars = segment.replace(illegalCharacterToBlankMatch, '')
	if (messages && cleanedBlankChars !== segment) {
		messages.push({
			level: 'warning',
			message: 'The characters <>:"?* are not allowed and have been removed.'
		})
	}

	const cleanedSpaceChars = cleanedBlankChars.replace(illegalCharacterToSpaceMatch, ' ')
	if (messages && cleanedBlankChars !== cleanedSpaceChars) {
		messages.push({
			level: 'warning',
			message: 'Forward slashes (/), backslashes (\\), pipes (|), newlines, and returns are not allowed and have been replaced with spaces.'
		})
	}

	const cleanedEndingChars = cleanedSpaceChars.replace(endingCharacterMatch, '')
	if (messages && cleanedEndingChars !== cleanedSpaceChars) {
		messages.push({
			level: 'warning',
			message: 'File & folder names may not end with a space or a period. They have been removed.'
		})
	}

	const trimmed = cleanedEndingChars.trim()
	if (messages && trimmed !== cleanedEndingChars) {
		messages.push({
			level: 'warning',
			message: 'File & folder names may not begin or end with blank space.'
		})
	}
	
	const reserveMatch = trimmed.match(reservedNames)
	if (reserveMatch) {
		messages?.push({
			level: 'error',
			message: `"${reserveMatch[1]}" is a reserved name and cannot be used.`
		})
		return false // This is just not valid
	}

	return trimmed
}

/**
 * Validates a path, removing invalid characters if possible.
 * @param path The path to validate
 * @param messages If present, error messages will be pushed out.
 * @returns The path if it is valid, a cleaned path if it is cleanable, or false if it cannot be cleaned.
 */
export function validatePath(path: string, messages?: PathValidationMessages): string | false {
	let segments = paths.segment(path)
	if (segments == null) {
		messages?.push({
			level: 'error',
			message: 'Cannot segment path.'
		})
		return false
	}

	for (let i = 0; i < segments.length; i++) {
		const cleaned = validateFileSegment(segments[i], messages)
		if (cleaned === false) return false
		segments[i] = cleaned
		if (cleaned === '' && (i || segments[0] !== '')) {
			messages?.push({
				level: 'error',
				message: 'Empty folder paths are not allowed'
			})
			return false
		}
	}

	if (segments[0] === '') {
		return paths.join('/', ...segments)
	}

	return paths.join(...segments)
}
