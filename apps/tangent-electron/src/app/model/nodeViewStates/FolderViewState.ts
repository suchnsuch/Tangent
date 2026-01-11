import type FolderInfo from 'common/dataTypes/FolderInfo'
import { DirectoryStore, iterateOverChildren, TreePredicateResult } from "common/trees"
import { getEmbedType } from 'common/embedding'
import type CreationRule from 'common/settings/CreationRule'
import type { CreationRuleDefinition } from 'common/settings/CreationRule'
import { WritableStore } from 'common/stores'
import { derived } from 'svelte/store'
import type DataFile from '../DataFile'
import type Folder from "../Folder"
import { BaseSetViewState } from './SetViewState'
import type ViewStateContext from './ViewStateContext'
import FolderSettingsView from 'app/views/node-views/FolderSettingsView.svelte'
import FolderDetailsSummary from 'app/views/summaries/FolderDetailsSummary.svelte'

export default class FolderViewState extends BaseSetViewState {
	readonly folder: Folder
	readonly folderInfoFile: DataFile
	readonly folderInfo = new WritableStore<FolderInfo>(null)

	constructor(context: ViewStateContext, folder: Folder) {
		super(context)
		this.folder = folder
		this.folderInfoFile = folder.getFolderInfoFile()

		this.folderInfoFile.loadData<FolderInfo>().then(info => {
			this.folderInfo.set(info)
		})

		const workspace = this.folder.workspace

		const handle = workspace.getHandle(folder)
		this._nodes = derived(handle, _ => {
			return [...iterateOverChildren(this.folder, item => {
				if (item.name.startsWith('.')) {
					return TreePredicateResult.Ignore
				}
				if (item.children) {
					return TreePredicateResult.OnlyIncludeChildren
				}
				if (item.fileType === '.md' || getEmbedType(item)) {
					if (item.meta?.virtual) return TreePredicateResult.Ignore
					return TreePredicateResult.Include
				}
				return TreePredicateResult.Ignore
			})]
		})

		this._creationRules = derived(workspace.workspaceSettings,
			(settings, set) => {
				return derived(
					[workspace.directoryStore, settings.creationRules],
					([directory, rules]) => {
					const relativeFolder = (directory as DirectoryStore).pathToRelativePath(this.folder.path)
	
					const filtered: (CreationRule|CreationRuleDefinition)[] = rules
						.filter(rule => {
							return rule.folder.value === relativeFolder
						})
	
					if (filtered.length === 0) {
						filtered.push({
							name: `Note in "${this.folder?.name}"`,
							nameTemplate: '%name%',
							folder: this.folder?.relativePath,
							mode: 'create'
						} as CreationRuleDefinition)
					}
	
					return filtered
				}).subscribe(set)
			})
	}

	get node() { return this.folder }
	get info() { return this.folderInfo }

	dispose() {
		super.dispose()
		this.folderInfoFile.unloadFile()
	}

	get settingsComponent() { return FolderSettingsView }
	get detailsSummaryComponent() { return FolderDetailsSummary }
}
