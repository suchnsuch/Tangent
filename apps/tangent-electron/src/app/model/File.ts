import paths from 'common/paths'
import type { TreeNode } from 'common/trees'
import type Workspace from './Workspace'
import WorkspaceTreeNode from './WorkspaceTreeNode'

export type FileLoadState = 'unloaded' | 'loading' | 'loaded' | 'new'

export default abstract class File extends WorkspaceTreeNode {
	loadCount: number
	loadState: FileLoadState
	isDirty: boolean

	constructor(node: TreeNode, workspace: Workspace) {
		super(node, workspace)

		this.loadCount = 0
		this.loadState = 'unloaded'
		this.isDirty = false
	}

	rename(newName: string) {
		const superResult = super.rename(newName)

		if (this.loadState === 'new') {
			this.loadState = 'loaded'
		}

		return superResult
	}

	loadFile() {
		this.loadCount++
		if (!this.isLoaded) {
			this.api.openFile(this.path)
			if (this.loadState !== 'new' && this.loadState !== 'loaded') {
				this.loadState = 'loading'
			}
		}
	}

	setFileContent(content: string | unknown) {
		if (this.loadState === 'loading') {
			this.loadState = 'loaded'
		}
		this.realizeFile()
		this.onFileContentChanged(content)
	}

	/**
	 * Ensures that the file and all of its parents are marked as non-virtual
	 */
	realizeFile() {
		if (this.meta?.virtual) {
			this.meta.virtual = false
			this.workspace.ensureFolderExists(paths.dirname(this.path))
			this.notifyChanged()
		}
	}

	dropFile() {
		this.loadCount--
		if (this.loadCount < 0) {
			console.error('File load count dropped below 0', this)
		}
		if (this.loadCount <= 0) {
			this.unloadFile()
		}
	}

	unloadFile() {
		if (this.isLoaded) {
			if (this.isDirty) {
				this.saveFile();
			}
			this.onUnloaded()
			this.loadState = 'unloaded'

			this.api.closeFile(this.path)
		}
	}

	saveFile() {
		if (this.isDirty && this.isReady) {
			const content = this.getFileContent()
			if (typeof content !== 'string') {
				return
			}

			// TODO: An attempt to find why/when this is happening
			if (!content) {
				console.error('Almost wrote empty file', this)
			}
			else {
				console.log('saving', this.name)
				this.api.updateFile(this.path, content)
			}
			
			this.isDirty = false
			if (this.loadState === 'new') {
				this.loadState = 'loaded'
			}

			this.notifyChanged()
		}
	}

	abstract getFileContent(): string | unknown
	abstract onFileContentChanged(content: string | unknown)
	abstract onUnloaded()

	get isLoaded() {
		return this.loadState != 'unloaded'
	}

	get isReady() {
		return this.loadState === 'loaded' || this.loadState === 'new'
	}
}
