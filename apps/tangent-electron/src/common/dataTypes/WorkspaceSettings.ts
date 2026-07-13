import { ObjectStore, PatchableList, RawPatchableList, WritableStore } from 'common/stores'
import { makeRegexPathAgnostic } from '../paths'
import CreationRule from '../settings/CreationRule'
import AttachmentRule from 'common/settings/AttachmentRule'
import type { DataType } from '.'
import type { TreeNode, DirectoryStore } from 'common/trees'

class CreationRuleList extends PatchableList<CreationRule, any> {

	constructor() {
		super([], {
			patchItems: true
		})
	}

	protected convertFromPatchItem(patchItem: any) {
		return new CreationRule(patchItem)
	}
}

class AttachmentRuleList extends PatchableList<AttachmentRule, any> {

	constructor() {
		super([], {
			patchItems: true
		})
	}

	protected convertFromPatchItem(patchItem: any) {
		return new AttachmentRule(patchItem)
	}
}

const pathMatcher = makeRegexPathAgnostic(/\.tangent\/workspace-settings\.json$/)

export default class WorkspaceSettings extends ObjectStore {

	static readonly LATEST_VERSION = 1

	version = new WritableStore(WorkspaceSettings.LATEST_VERSION)

	creationRules = new CreationRuleList()
	attachmentRules = new AttachmentRuleList()

	styleFiles = new RawPatchableList<string>()

	constructor({ json }) {
		super()

		this.applyPatch(json)
		this.setupObservables()
	}

	static isType(store: DirectoryStore, node: TreeNode) {
		return node.path.match(pathMatcher) != null
	}
}

WorkspaceSettings satisfies DataType
