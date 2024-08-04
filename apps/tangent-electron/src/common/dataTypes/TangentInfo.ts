import { ObjectStore, WritableStore } from 'common/stores'
import { DirectoryStore, TreeItemListReference, TreeItemReference, TreeNode } from 'common/trees'
import type { DataTypeConstructionContext } from './DataType'
import type DataType from './DataType'
import { enumKeys } from 'common/utils'
import ZoomSetting from 'common/settings/ZoomSetting'
import type { SettingDefinition } from 'common/settings/Setting'

export const filename = 'tangent.json'

export enum FocusLevel {
	Map = -1,

	Thread = 0,

	File = 1,
	Typewriter = 2,
	Paragraph = 3,
	Line = 4,
	Sentence = 5,

	Lowest = Map,
	Highest = Sentence
}

export namespace FocusLevel {
	export function getShortName(level: FocusLevel) {
		for (const name of enumKeys(FocusLevel)) {
			if (FocusLevel[name] === level) {
				return name
			}
		}
	}

	export function getFullName(level: FocusLevel, capitalized=true) {
		let result = getShortName(level)
		if (level >= FocusLevel.File) {
			result += capitalized ? ' Focus Mode' : ' focus mode'
		}
		else {
			result += capitalized ? ' View' : ' view'
		}
		return result
	}

	function* iterFocusLevels(from: FocusLevel = FocusLevel.Lowest, to: FocusLevel = FocusLevel.Highest) {
		for (let i = from; i <= to; i++) {
			yield i as FocusLevel
		}
	}

	export const allFocusLevels = [...iterFocusLevels()]
	export const focusModeFocusLevels = [...iterFocusLevels(FocusLevel.File, FocusLevel.Highest)]

	export function describeFocusLevel(level: FocusLevel) {
		switch (level) {
			case FocusLevel.File:
				return `Hides all other files except for the selected file.`
			case FocusLevel.Typewriter:
				return `Hides all other files and centers the cursor vertically as you type.`
			case FocusLevel.Paragraph:
				return `Hides all other files and highlights the current paragraph block.`
			case FocusLevel.Line:
				return 'Hides all other files and highlights the current line.'
			case FocusLevel.Sentence:
				return `Hides all other files and highlights the current sentence.`
		}
	}
}

const mapZoomDefinition: SettingDefinition<number> = {
	defaultValue: 1,
	range: {
		min: .1,
		max: 1
	}
}

export default class TangentInfo extends ObjectStore {
	_store: DirectoryStore

	openSessions: TreeItemListReference<TreeNode>
	activeSession: TreeItemReference<TreeNode>

	focusLevel = new WritableStore(FocusLevel.Thread)

	scrollX: WritableStore<number> = new WritableStore(0)
	scrollY: WritableStore<number> = new WritableStore(0)
	zoom = new ZoomSetting(mapZoomDefinition)

	constructor({ store, json }: DataTypeConstructionContext) {
		super()

		this._store = store

		this.openSessions = new TreeItemListReference(store, [])
		this.activeSession = new TreeItemReference(store, null)

		this.applyPatch(json)

		this.setupObservables()
	}

	static isType(store: DirectoryStore, node: TreeNode) {
		return node.path.endsWith(filename)
	}
}

TangentInfo satisfies DataType
