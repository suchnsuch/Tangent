import type { TreeNode, DirectoryStore } from 'common/trees'

export interface TreeNodeReference {
	path: string

	// Values for caching
	node?: TreeNode
	content?: string
	lines?: string[]
	

	// The range that the reference refers to
	start?: number
	end?: number

	title?: string
	preview?: NodePreview | NodePreview[]
	annotations?: Annotation[]
}

export type NodePreview = string | TextSelectionPreview

export interface TextSelectionPreview {
	// Where the content starts in the node
	start: number
	content: string
}

export interface Annotation {
	start: number
	end: number
	/**
	 * A string intends for a simple message to be attached to the text range.
	 * Other information could be handled in some custom manner.
	 */
	data: any
}

export type TreeNodeOrReference = TreeNode | TreeNodeReference

export function getNodeFromReference(reference: TreeNodeReference, directory: DirectoryStore) {
	if (!reference.node) {
		reference.node = directory.get(reference.path)
	}
	return reference.node
}

export function isSubReference(reference: TreeNodeOrReference) {
	if (!isNode(reference) && ("start" in reference || "end" in reference)) {
		return true
	}
	return false
}

export function isNode(item: TreeNodeOrReference): item is TreeNode {
	// TODO: This is pretty sketchy, but better than using a different key for "path"
	return "fileType" in item
}

export function isReference(item: TreeNodeOrReference): item is TreeNodeReference {
	return !isNode(item)
}

export function areReferencesEquivalent(a: TreeNodeOrReference, b: TreeNodeOrReference) {
	if (a.path === b.path) {
		const aIsSub = isSubReference(a)
		const bIsSub = isSubReference(b)
		if (aIsSub && bIsSub) {
			const aSub = a as TreeNodeReference
			const bSub = b as TreeNodeReference

			return aSub.start === bSub.start && aSub.end === bSub.end
		}
		else if (aIsSub !== bIsSub) return false
		return true
	}
	return false
}

export function getNode(item: TreeNodeOrReference, directory: DirectoryStore): TreeNode {
	if (isNode(item)) return item
	return getNodeFromReference(item, directory)
}

export function createReference(node: TreeNode, includeNode=false, other?: Partial<TreeNodeReference>): TreeNodeReference {
	const result: TreeNodeReference = { path: node.path }
	if (includeNode) result.node = node

	if (other) {
		return { ...other, ...result }
	}

	return result
}

/**
 * Cleans out the cache of a reference. This makes it safe for serialization.
 * @param reference 
 */
export function cleanReference(reference: TreeNodeReference) {
	delete reference.node
	delete reference.content
	delete reference.lines
}

export function addPreviewToReference(reference: TreeNodeReference, preview: NodePreview) {
	if (!reference.preview) {
		reference.preview = preview
		return
	}

	if (!Array.isArray(reference.preview)) {
		reference.preview = [reference.preview]
	}
	reference.preview.push(preview)
}

export function indexOfMatch(list: TreeNodeOrReference[], target: TreeNodeOrReference) {
	if (isNode(target)) {
		for (let i = 0; i < list.length; i++) {
			const item = list[i]
			if (isSubReference(item)) continue
			if (item.path === target.path) return i
		}
	}
	else if (isSubReference(target)) {
		for (let i = 0; i < list.length; i++) {
			const item = list[i]
			if (isSubReference(item)) {
				if (item.path === target.path &&
					(item as TreeNodeReference).start === target.start &&
					(item as TreeNodeReference).end === target.end) {
					return i
				}
			}
		}
	}
	else {
		for (let i = 0; i < list.length; i++) {
			const item = list[i]
			if (isSubReference(item)) continue
			if (item.path === target.path) return i
		}
	}
	return -1
}
