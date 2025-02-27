import paths, { normalizeSeperators } from 'common/paths';
import { DirectoryStore, TreeNode } from 'common/trees';
import type { TagTreeNode } from './TagNode';

export interface IndexTreeStoreInit<FileRoot, TagRoot> {
	files: FileRoot,
	tags: TagRoot
}

type FolderCreatorFunc = (parent: TreeNode, name: string) => TreeNode | Promise<TreeNode>

const FILES_PLACEHOLDER = 'FILES/'

export default class IndexTreeStore
	<
		FileRoot extends TreeNode,
		TagRoot extends TagTreeNode
	>
extends DirectoryStore {

	_files: FileRoot
	_tags: TagRoot

	constructor({ files, tags }: IndexTreeStoreInit<FileRoot, TagRoot>) {
		super([files, tags])

		this._files = files
		this._tags = tags
	}

	get files() { return this._files }
	get tags() { return this._tags }

	async ensureFolderExists(folderPath: string, folderCreator: FolderCreatorFunc, virtual=false) {
		// Make into a relative path if necessarty
		const relativePathResult = paths.getChildPath(this.files.path, folderPath)
		if (relativePathResult === '') {
			// We're looking directly for the root, and know it exists
			return this.files
		}
		else if (relativePathResult) {
			// The path is now relative
			folderPath = relativePathResult
		}

		let parent: TreeNode = this.files
		let folder: TreeNode = null
		let currentFolderPath = this.files.path
		
		const segments = paths.segment(folderPath)
		for (let index = 0; index < segments.length; index++) {
			// Use paths.join so that seperators are native
			currentFolderPath = paths.join(currentFolderPath, segments[index])
			folder = this.get(currentFolderPath)

			// Call the folder creator in the case of creating a non-virtual folder chain
			// if any parent is still virtual
			if (!folder || (!virtual && folder.meta?.virtual)) {
				const creationResult = folderCreator(parent, segments[index])
				if ('then' in creationResult && typeof creationResult.then === 'function') {
					folder = await creationResult
				}
				else {
					folder = creationResult as TreeNode
				}
			}

			parent = folder
		}
		return folder
	}

	pathToPortablePath(workspacePath: string): string {
		if (!workspacePath) return undefined
		const fileChildPath = paths.getChildPath(this.files.path, workspacePath)
		if (fileChildPath !== false) return normalizeSeperators(FILES_PLACEHOLDER + fileChildPath) // Files are something else

		const tagChildPath = paths.getChildPath(this.tags.path, workspacePath)
		if (tagChildPath !== false) return workspacePath // Tag paths are portable
		
		throw new Error('Could not create a portable path from ' + workspacePath + '. File root: ' + this.files.path)
	}

	portablePathToPath(portablPath: string): string {
		if (!portablPath) return undefined
		if (portablPath.startsWith(FILES_PLACEHOLDER)) {
			return normalizeSeperators(paths.join(this.files.path, portablPath.substring(FILES_PLACEHOLDER.length)))
		}

		const tagChildPath = paths.getChildPath(this.tags.path, portablPath)
		if (tagChildPath !== false) return portablPath // Tag paths are effectively full paths

		throw new Error('Could not convert portable path: ' + portablPath)
	}

	unknownStringToPath(path: string): string {
		if (!path) return undefined
		if (path.startsWith(this._files.path)) return path
		return this.portablePathToPath(path)
	}

	isPortablePath(path: string): boolean {
		if (!path) return false
		if (path.startsWith(FILES_PLACEHOLDER)) return true
		if (path.startsWith(this.tags.path)) return true
		return false
	}
}

export type DefaultIndexStore = IndexTreeStore<TreeNode, TagTreeNode>