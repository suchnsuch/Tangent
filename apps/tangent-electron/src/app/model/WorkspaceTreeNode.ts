import { type TreeNode, validateFileSegment } from 'common/trees'
import { SelfStore, applyPatch, lazyInitializeSubscriptionList } from 'common/stores'
import type { IndexData } from 'common/indexing/indexTypes'
import { diffStructure, type StructureDelta } from 'common/indexing/structureUtils';
import paths from "common/paths";
import type Workspace from "./Workspace";

type StructureWatcher = (delta: StructureDelta) => void

let localId = 0
function getLocalId() {
	return localId++
}

export default abstract class WorkspaceTreeNode extends SelfStore implements TreeNode {

	path: string
	name: string
	fileType: string
	depth: number

	created: Date
	modified: Date

	meta: IndexData

	localId: number

	private structureWatchers?: StructureWatcher[]
	
	readonly workspace: Workspace

	constructor(node: TreeNode, workspace: Workspace) {
		super()

		this.path = node.path
		this.name = node.name
		this.fileType = node.fileType
		this.depth = node.depth

		this.created = node.created
		this.modified = node.modified

		this.meta = node.meta

		this.workspace = workspace

		this.localId = getLocalId()
	}

	get api() {
		return this.workspace.api.file
	}

	get relativePath() {
		return this.workspace.directoryStore.pathToRelativePath(this.path)
	}

	integrateFrom(node: TreeNode) {
		if (node.name)
			this.name = node.name
		if (node.created)
			this.created = node.created
		if (node.modified)
			this.modified = node.modified

		if (node.meta) {
			if (this.meta) {
				if (this.structureWatchers?.length) {
					const delta = diffStructure(this.meta.structure, node.meta.structure)
					for (const handler of this.structureWatchers) {
						handler(delta)
					}
				}
				applyPatch(this.meta, node.meta, { applyToRawValues: true })
			}
			else {
				this.meta = node.meta
			}
		}

		this.notifyChanged()
	}

	rename(newName: string) {
		if (!newName) return false
		
		if (this.fileType.startsWith('.')) {
			newName += this.fileType
		}
		const validatedName = validateFileSegment(newName)
		if (!validatedName) return false

		const dir = paths.dirname(this.path)
		const newPath = paths.join(dir, validatedName)
		
		if (this.fileType.startsWith('.')) {
			// Remove the extension
			this.name = validatedName.slice(0, validatedName.length - this.fileType.length)
		}
		else {
			this.name = validatedName
		}
		this.api.move(this.path, newPath)
		return true
	}

	observeStructureChanges(handler: StructureWatcher): () => void {
		return lazyInitializeSubscriptionList(this, 'structureWatchers', handler)
	}
}
