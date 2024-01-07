import type { TreeNode, DirectoryStore } from 'common/trees'
import { ObjectStore, PatchableMap } from 'common/stores'
import { makeRegexPathAgnostic } from 'common/paths'
import TagSettings from 'common/settings/TagSettings'
import type DataType from './DataType'

const pathMatcher = makeRegexPathAgnostic(/\.tangent\/tags\.json$/)

class TagSettingsMap extends PatchableMap<string, TagSettings, any> {
	constructor() {
		super(null, {
			observeItems: true
		})
	}

	protected convertKeyToPatch(key: string) { return key }
	protected convertPatchKeyToKey(patchKey: string) { return patchKey }
	protected convertPatchValueToValue(patchValue: any): TagSettings {
		return new TagSettings(patchValue)
	}
}

export default class TagSettingsSet extends ObjectStore {

	settings = new TagSettingsMap()
	
	constructor({ json }) {
		super()

		this.applyPatch(json)
		this.setupObservables()
	}

	static isType(store: DirectoryStore, node: TreeNode) {
		return node.path.match(pathMatcher) != null
	}
}

TagSettingsSet satisfies DataType
