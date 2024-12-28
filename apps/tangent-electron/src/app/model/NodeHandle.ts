import { DefaultIndexStore } from 'common/indexing/IndexTreeStore'
import { HrefFormedLink } from 'common/indexing/indexTypes'
import { resolveLink } from 'common/markdownModel/links'
import { TreeChange, TreeNode } from 'common/trees'
import WorkspaceTreeNode from './WorkspaceTreeNode'
import { UrlData } from 'common/urlData'
import Workspace from './Workspace'

type MaybeSubscribableNode = TreeNode & { subscribe?: any }
export type HandleResult = string | MaybeSubscribableNode | MaybeSubscribableNode[] | UrlData

export function handleIsNode(handle: HandleResult): handle is MaybeSubscribableNode {
	return typeof handle === 'object' && !Array.isArray(handle) && isNode(handle)
}

export function isNode(obj: MaybeSubscribableNode | UrlData): obj is MaybeSubscribableNode {
	return 'path' in obj
}

export function isUrlData(obj: MaybeSubscribableNode | UrlData): obj is UrlData {
	return 'url' in obj
}

function pathAffectsPath(a: string, b: string): boolean {
	if (a === b) return true
	if (a.length < b.length) {
		return b.startsWith(a)
	}
	else return a.startsWith(b)
}

export default class NodeHandle {
	workspace: Workspace

	node: WorkspaceTreeNode
	link: HrefFormedLink
	set: (value: HandleResult) => void

	dirty = false

	private value: HandleResult
	private targetUnobserver: () => void
	private _requestId = 0

	constructor(
		workspace: Workspace,
		set: (value: HandleResult) => void,
		node: WorkspaceTreeNode,
		link: HrefFormedLink
	) {
		this.workspace = workspace
		this.set = set
		this.node = node
		this.link = link
	}

	pushChangesIfDirty() {
		if (this.dirty) {
			this.set(this.value)
			this.dirty = false
		}
	}

	resolve() {
		const newValue = this.node ?? (resolveLink(this.workspace.directoryStore, this.link) || null)
		if (newValue !== this.value) {
			if (this.targetUnobserver) {
				this.targetUnobserver()
				this.targetUnobserver = null
			}

			const requestId = this._requestId += 1

			if (typeof newValue === 'string') {
				// external link
				this.value = newValue
				// Get information about the external link
				this.workspace.api.links.getUrlData(newValue).then(result => {
					if (this._requestId === requestId) {
						this.value = result
						this.dirty = true
						this.pushChangesIfDirty()
					}
				})
			}
			else {
				this.value = newValue

				if (newValue && !Array.isArray(newValue)) {
					if ((newValue as any).subscribe) {
						this.targetUnobserver = (newValue as any).subscribe(t => {
							// Notify when the node changes
							this.set(t)
						})
					}
				}
			}
			this.dirty = true
		}
	}

	*iterPaths() {
		if (!this.value || typeof this.value === 'string') return
		if (Array.isArray(this.value)) {
			for (const v of this.value) {
				yield v.path
			}
		}
		else if (isNode(this.value)) {
			yield this.value.path
		}
	}

	checkTreeChange(change: TreeChange) {
		if (this.dirty || !this.value) return
		
		for (const path of this.iterPaths()) {
			if (change.removed) {
				for (const filepath of change.removed) {
					if (pathAffectsPath(filepath, path)) {
						this.dirty = true
						return
					}
				}
			}

			if (change.moved) {
				for (const item of change.moved) {
					if (pathAffectsPath(item.oldPath, path) || pathAffectsPath(item.node.path, path)) {
						this.dirty = true
						return
					}
				}
			}

			if (change.added) {
				for (let newNode of change.added) {
					if (pathAffectsPath(newNode.path, path)) {
						this.dirty = true
						return
					}
				}
			}

			if (change.changed) {
				for (let item of change.changed) {
					if (pathAffectsPath(item.path, path)) {
						this.dirty = true
						return
					}
				}
			}
		}
	}
}
