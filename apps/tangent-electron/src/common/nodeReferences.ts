import type { TreeNode, DirectoryStore } from 'common/trees'

export interface TreeNodeReference {
	path: string

	// Values for caching
	id?: string
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

function areNodePreviewsEquivalent(a: NodePreview, b: NodePreview) {
	if (a === b) return true
	const aString = typeof a === 'string'
	const bString = typeof b === 'string'

	if (aString || bString) return false

	if (a.start != b.start) return false
	if (a.content != b.content) return false
	return true
}

export function isReferenceEquivalentToNode(reference: TreeNodeReference, node: TreeNode) {
	if (reference.path !== node.path) return false
	if (reference.annotations) return false // An annotated node has more information and is not the same
	if (reference.start || reference.end) return false
	return true
}

export function areReferencesEquivalent(a: TreeNodeReference, b: TreeNodeReference) {
	if (a.path != b.path) return false
	if (a.start !== b.start || a.end !== b.end) return false
	if (a.title != b.title) return false

	if (a.annotations != b.annotations) {
		if (!a.annotations || !b.annotations) return false
		if (a.annotations.length != b.annotations.length) return false
		for (let index = 0; index < a.annotations.length; index++) {
			const annotationA = a.annotations[index]
			const annotationB = b.annotations[index]
			if (annotationA.start != annotationB.start) return false
			if (annotationA.end != annotationB.end) return false
			if (annotationA.data != annotationB.data) return false
		}
	}

	if (a.preview != b.preview) {
		if (!a.preview || !b.preview) return false
		const aArray = Array.isArray(a.preview)
		const bArray = Array.isArray(b.preview)
		if (aArray != bArray) return false
		if (aArray) {
			if ((a.preview as NodePreview[]).length != (b.preview as NodePreview[]).length) return false
			for (let index = 0; index < (a.preview as NodePreview[]).length; index++) {
				const previewA = (a.preview as NodePreview[])[index]
				const previewB = (b.preview as NodePreview[])[index]
				if (!areNodePreviewsEquivalent(previewA, previewB)) return false
			}
		}
		else if (!areNodePreviewsEquivalent(a.preview as NodePreview, b.preview as NodePreview)) {
			return false
		}
	}
}

export function areNodesOrReferencesEquivalent(a: TreeNodeOrReference, b: TreeNodeOrReference) {
	if (a == b) return true // Catches direct tree node comparison
	if (!a || !b) return false // Falsy values are bad

	const aIsNode = isNode(a)
	const bIsNode = isNode(b)

	if (aIsNode && !bIsNode) return isReferenceEquivalentToNode(b, a)
	if (!aIsNode && bIsNode) return isReferenceEquivalentToNode(a, b)
	if (aIsNode && bIsNode) return false // Tree nodes are direct compare only
	return areReferencesEquivalent(a, b)
}

/**
 * Returns an id that provides a unique identifier for a node or reference.
 * Nodes are id'd by identity (object).
 * References are id'd by string. Equivalent references should have the same id.
 */
export function getNodeOrReferenceId(item: TreeNodeOrReference): any {
	if (isNode(item)) return item

	if (!item.id) {
		let id = item.path

		const additions = []

		if (item.title) {
			additions.push('title=' + item.title)
		}
		if (item.start) {
			additions.push('start=' + item.start)
		}
		if (item.end) {
			additions.push('end=' + item.end)
		}

		if (item.annotations) {
			for (const annotation of item.annotations) {
				additions.push('a_start=', annotation.start)
				additions.push('a_end=', annotation.end)
				additions.push('a_data=', annotation.data)
			}
		}

		if (additions.length) {
			id += '?' + additions.join('&')
		}
		
		item.id = id
	}

	return item.id
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
	delete reference.id
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
