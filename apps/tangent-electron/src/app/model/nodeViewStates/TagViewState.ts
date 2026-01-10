import TagSettingsView from 'app/views/node-views/TagSettingsView.svelte'
import type TagInfo from 'common/dataTypes/TagInfo'
import { ReadableStore, WritableStore } from 'common/stores'
import type { TreeNode } from 'common/trees'
import { derived } from 'svelte/store'
import type DataFile from '../DataFile'
import type Tag from '../Tag'
import { BaseSetViewState } from './SetViewState'
import type ViewStateContext from './ViewStateContext'
import TagDetailsSummary from 'app/views/summaries/TagDetailsSummary.svelte'

export default class TagViewState extends BaseSetViewState {
	readonly tag: Tag
	readonly tagInfoFile: DataFile
	readonly tagInfo = new WritableStore<TagInfo>(null)

	readonly pinSettings = new ReadableStore(true)

	constructor(context: ViewStateContext, tag: Tag) {
		super(context)
		this.tag = tag
		this.tagInfoFile = tag.getTagInfoFile()

		this.tagInfoFile.loadData<TagInfo>().then(info => {
			this.tagInfo.set(info)
		})

		const workspace = this.tag.workspace

		this._nodes = derived(
			[tag, workspace.directoryStore],
			([tag, directory]) => {
				const sourceList = [tag]
				const nodes = new Set<TreeNode>

				while (sourceList.length) {
					const item = sourceList.pop()

					if (item.meta?.inLinks) {
						// Pull in connected nodes
						for (const connection of item.meta.inLinks) {
							const target = directory.get(connection.from)
							if (target) {
								nodes.add(target)
							}
						}
					}

					// Append tag children
					if (item.children) {
						sourceList.push(...item.children)
					}
				}

				return [...nodes.values()]
			}
		)

		// TODO: Something that handles this
		this._creationRules = new ReadableStore([])
	}

	get node() { return this.tag }
	get info() { return this.tagInfo }

	dispose() {
		super.dispose()
		this.tagInfoFile.unloadFile()
	}

	get settingsComponent() { return TagSettingsView }
	get detailsSummaryComponent() { return TagDetailsSummary }
}