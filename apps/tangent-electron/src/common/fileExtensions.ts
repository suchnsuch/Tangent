import { queryFileType } from './dataTypes/QueryInfo'

export function getExtensionRegex(extensions: string[]) {
	let matchString = '\\.('
	for (let i = 0; i < extensions.length; i++){
		const extension = extensions[i]
		const extensionName = extension.startsWith('.') ? extension.substring(1) : extension
		if (i > 0) {
			matchString += '|'
		}
		matchString += `${extensionName}`
	}

	matchString += ')$'

	return new RegExp(matchString, 'i')
}

export function getFileTypeRegex(fileTypes: string[]) {
	let matchString = '('
	for (let i = 0; i < fileTypes.length; i++){
		const fileType = fileTypes[i]
		const fileTypeMatch = fileType.startsWith('.') ? '\\' + fileType : fileType
		if (i > 0) {
			matchString += '|'
		}
		matchString += `${fileTypeMatch}`
	}

	matchString += ')$'

	return new RegExp(matchString, 'i')
}

export const noteFileExtensions = [
	'.md', '.mdx'
]
export const noteExtensionMatch = getExtensionRegex(noteFileExtensions)

export const imageFileExtensions = [
	'.png',
	'.jpeg',
	'.jpg',
	'.gif',
	'.bmp',
	'.svg'
]
export const imageExtensionMatch = getExtensionRegex(imageFileExtensions)

export const styleFileExtensions = ['.css']
export const styleExtensionMatch = getExtensionRegex(styleFileExtensions)

// TODO: Criminally incomplete
export const codeExtensions = [
	'.js', '.jsx', '.ts', '.tsx',
	'.h', '.cpp',
	'.cs', '.py', '.java',
	'.rs',

	'.json', '.html', '.css'
]

// Split this off to other places when appropriate
export const mscExtensions = [
	'.txt', '.csv',
	'.json'
]

export const knownExtensionsMatch = getExtensionRegex([
	...noteFileExtensions,
	...imageFileExtensions,
	...codeExtensions,
	...mscExtensions
])

/**
 * These are the file types that users can interact with
 */
export const visibleFileTypeMatch = getFileTypeRegex([
	...noteFileExtensions, ...imageFileExtensions,
	queryFileType, 'folder', 'tag'
])

/**
 * These are extensions that do not need to be shown
 */
export const implicitExtensionsMatch = getExtensionRegex([
	'.md', queryFileType
])
