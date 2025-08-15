import { queryFileType } from './dataTypes/QueryInfo';
import type { TreeNode } from 'common/trees'
import { audioFileExtensions, codeExtensions, imageFileExtensions, mscExtensions, noteFileExtensions, videoFileExtensions } from './fileExtensions';

export const docIcon = ['file.svg#document']
export const noteIcon = ['file.svg#document', 'file.svg#text']
export const imageIcon = ['file.svg#document', 'file.svg#image']
const audioIcon = ['audio.svg#audio']
const videoIcon = ['video.svg#video']

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

// Customize for audio
for (const ext of audioFileExtensions) {
	icons[ext] = audioIcon
}

// Video icon
for (const ext of videoFileExtensions) {
	icons[ext] = videoIcon
}

const noIcon = []

export function iconForNode(node: TreeNode) {
	if (!node) return noIcon
	return icons[node.fileType] ?? noIcon
}
