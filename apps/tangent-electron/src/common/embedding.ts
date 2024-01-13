import type { TreeNode } from 'common/trees'
import { imageExtensionMatch, styleExtensionMatch } from './fileExtensions'


export enum EmbedType {
	Invalid,
	Image,
	Style
}

export function getEmbedType(target: TreeNode) {
	if (target) {
		const fileType = target.fileType
		if (fileType.match(imageExtensionMatch)) {
			return EmbedType.Image
		}
		if (fileType.match(styleExtensionMatch)) {
			return EmbedType.Style
		}
	}
	return EmbedType.Invalid
}
