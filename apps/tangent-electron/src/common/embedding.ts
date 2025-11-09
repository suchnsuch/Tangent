import type { TreeNode } from 'common/trees'
import { audioExtensionMatch, imageExtensionMatch, pdfExtensionMatch, styleExtensionMatch, videoExtensionMatch } from './fileExtensions'


export enum EmbedType {
	Invalid,
	Image,
	Audio,
	Video,
	PDF,
	Style
}

export function getEmbedType(target: TreeNode) {
	if (target) {
		const fileType = target.fileType
		if (fileType.match(imageExtensionMatch)) {
			return EmbedType.Image
		}
		if (fileType.match(pdfExtensionMatch)) {
			return EmbedType.PDF
		}
		if (fileType.match(styleExtensionMatch)) {
			return EmbedType.Style
		}
		if (fileType.match(audioExtensionMatch)) {
			return EmbedType.Audio
		}
		if (fileType.match(videoExtensionMatch)) {
			return EmbedType.Video
		}
	}
	return EmbedType.Invalid
}

export function getEmbedDisplayname(type: EmbedType, capitalized=true) {
	switch (type) {
		case (EmbedType.Image): return capitalized ? 'Image' : 'image'
		case (EmbedType.Audio): return capitalized ? 'Audio' : 'audio'
		case (EmbedType.Video): return capitalized ? 'Video' : 'video'
		case (EmbedType.PDF): return capitalized ? 'PDF' : 'pdf'
		case (EmbedType.Style): return capitalized ? 'Style' : 'style'
	}
}
