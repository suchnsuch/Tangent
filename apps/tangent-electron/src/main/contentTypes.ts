import path from 'path'

/**
 * Content types for everything served over Tangent's custom protocols.
 *
 * The media entries mirror the extension lists in `common/fileExtensions`;
 * anything that becomes embeddable there needs an entry here or it will be
 * served as a download. Fonts are included because user style sheets can pull
 * them in, and the web types are what the renderer bundle itself is made of.
 */
const contentTypes: { [extension: string]: string } = {
	// Images
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.bmp': 'image/bmp',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',

	// Audio
	'.mp3': 'audio/mpeg',
	'.m4a': 'audio/mp4',
	'.wav': 'audio/wav',
	'.ogg': 'audio/ogg',
	'.flac': 'audio/flac',

	// Video
	'.mov': 'video/quicktime',
	'.mp4': 'video/mp4',
	'.mkv': 'video/x-matroska',
	'.avi': 'video/x-msvideo',
	'.webm': 'video/webm',

	// Documents
	'.pdf': 'application/pdf',

	// The renderer bundle
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.map': 'application/json',
	'.txt': 'text/plain',
	'.wasm': 'application/wasm',

	// Fonts
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.otf': 'font/otf',
	'.eot': 'application/vnd.ms-fontobject'
}

export function getContentType(filepath: string) {
	return contentTypes[path.extname(filepath).toLowerCase()] ?? 'application/octet-stream'
}
