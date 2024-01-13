import { queryFileType } from './dataTypes/QueryInfo';
import type { TreeNode } from 'common/trees'
import { codeExtensions, imageFileExtensions, mscExtensions, noteFileExtensions } from './fileExtensions';

const docIcon = ['file.svg#document']
const noteIcon = ['file.svg#document', 'file.svg#text']
const imageIcon = ['file.svg#document', 'file.svg#image']

const icons = {
	'folder': ['folder.svg#folder'],
	'tag': ['tag.svg#tag'],
	[queryFileType]: ['query.svg#query']
}

/**
 * Build out the lookup table
 */
// Fill in all extensions with a baseline
for (const ext of [...codeExtensions, ...mscExtensions]) {
	icons[ext] = docIcon
}

// Customize for notes
for (const ext of noteFileExtensions) {
	icons[ext] = noteIcon
}

// Customize for images
for (const ext of imageFileExtensions) {
	icons[ext] = imageIcon
}

const noIcon = []

export function iconForNode(node: TreeNode) {
	if (!node) return noIcon
	return icons[node.fileType] ?? noIcon
}
