import { swapRemove } from '@such-n-such/core'
import { Workspace } from 'app/model'
import EmbedFile from 'app/model/EmbedFile'
import Folder from 'app/model/Folder'
import { HandleResult } from 'app/model/NodeHandle'
import WorkspaceTreeNode from 'app/model/WorkspaceTreeNode'
import paths from 'common/paths'
import { TreeNode, forAllNodes } from 'common/trees'
import { Readable, derived } from 'svelte/store'

class StyleFileHandle {

	manager: CustomStyleManager
	handleUnsub: () => void
	element: HTMLLinkElement

	constructor(manager: CustomStyleManager, filePath: string) {
		this.manager = manager
		
		this.handleUnsub = manager.workspace
			.getHandle(filePath)
			.subscribe(n => this.onNodeChanged(n))
	}

	onNodeChanged(value: HandleResult) {
		if (value instanceof EmbedFile) {
			if (!this.element) {
				const newElement = document.createElement('link')
				newElement.rel = 'stylesheet'
				newElement.href = value.cacheBustPath
				document.head.appendChild(newElement)
				this.element = newElement
			}
			else {
				// Update cache bust
				this.element.href = value.cacheBustPath
			}
		}
		else {
			this.removeElement()
		}
	}

	removeElement() {
		if (this.element) {
			this.element.remove()
			this.element = null
		}
	}

	dispose() {
		if (this.handleUnsub) {
			this.handleUnsub()
			this.handleUnsub = null
		}

		this.removeElement()
	}
}

export default class CustomStyleManager {
	workspace: Workspace

	fileHandles = new Map<string, StyleFileHandle>()

	activeStyles: Readable<string[]>

	availableStyles: Readable<TreeNode[]>

	unsubs: (() => void)[] = []

	constructor(workspace: Workspace) {
		this.workspace = workspace

		this.activeStyles = derived(workspace.workspaceSettings, (settings, set) => {
			if (settings) {
				return settings.styleFiles.subscribe(set)
			}
			else set([])
		})
		this.unsubs.push(this.activeStyles.subscribe(files => this.onActiveStyles(files)))

		const stylesFolderHandle = workspace.getHandle(paths.join(workspace.workspaceFolder.path, 'styles'))
		this.availableStyles = derived(stylesFolderHandle, value => {
			if (value instanceof Folder) {
				const styles = []
				forAllNodes(value, child => {
					if (child.fileType.toLowerCase() === '.css' && !child.meta?.virtual) {
						styles.push(child)
					}
				})
				return styles
			}
			return []
		})
	}

	dispose() {
		for (const unsub of this.unsubs) unsub()
		for (const handle of this.fileHandles.values()) {
			handle.dispose()
		}
	}

	onActiveStyles(files: string[]) {
		const oldHandles = [...this.fileHandles.keys()]

		for (const filePath of files) {
			if (swapRemove(oldHandles, filePath) < 0) {
				const handle = new StyleFileHandle(this, this.workspace.directoryStore.portablePathToPath(filePath))
				this.fileHandles.set(filePath, handle)
			}
		}

		for (const oldFile of oldHandles) {
			this.fileHandles.get(oldFile)?.dispose()
			this.fileHandles.delete(oldFile)
		}
	}
}
