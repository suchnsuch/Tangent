import { BaseSetViewState } from './SetViewState'
import type ViewStateContext from './ViewStateContext'
import type DataFile from '../DataFile'
import { derived, readable, Readable } from 'svelte/store'
import type QueryInfo from 'common/dataTypes/QueryInfo'
import { ReadableStore, WritableStore } from 'common/stores'
import QuerySettingsView from 'app/views/node-views/QuerySettingsView.svelte'
import type { QueryResult } from 'common/indexing/queryResults'
import { SelectEvent } from 'app/views/editors/selectionEvents'
import { allChangedPaths, TreeChange } from 'common/trees'
import { getInitialQuerySelection } from 'common/queryModel'

export default class QueryViewState extends BaseSetViewState {
	readonly queryFile: DataFile

	readonly queryInfo = new WritableStore<QueryInfo>(null)
	readonly pinSettings = new ReadableStore(true)

	readonly queryResult: Readable<QueryResult>
	readonly lastRequestID = new WritableStore<number>(0)
	readonly lastReceivedID = new WritableStore<number>(0)
	readonly isLoading: Readable<boolean>

	constructor(context: ViewStateContext, queryFile: DataFile) {
		super(context)
		this.queryFile = queryFile

		this.queryFile.loadData<QueryInfo>().then(info => {
			this.queryInfo.set(info)
		})

		const workspace = this.queryFile.workspace

		this.isLoading = derived([this.lastRequestID, this.lastReceivedID], ([requestID, receivedID]) => {
			return requestID > receivedID
		})

		this.queryResult = derived(this.queryInfo, (queryInfo, set) => {
			if (!queryInfo) {
				return null
			}
			// TODO: Improve query invalidation to reduce false positives
			return derived(queryInfo.queryString, (queryString, set) => {
				const id = this.lastRequestID.update(i => i + 1)
				const start = performance.now()
				console.log(`Making query ${id}: "${queryString}"`)
				workspace.api.query.resultsForQuery(queryString).then(queryResult => {
					const end = performance.now()
					console.log(`Received query ${id} in ${end - start}ms`)
					this.lastReceivedID.update(i => {
						if (i < id) {
							set(queryResult)
							return id
						}
						return i
					})
				})
			}).subscribe(set)
		}, null)

		this._nodes = derived(this.queryResult, queryResult => queryResult?.items ?? [])

		this._creationRules = readable([])
	}

	get node() { return this.queryFile }
	get info() { return this.queryInfo }

	get settingsComponent() { return QuerySettingsView }

	private _treeChangeTimeout: any = null

	onTreeChange(change: TreeChange) {
		// We don't want changes to the .tangent directory to cause query refreshes.
		const tangentFolderPath = this.queryFile.workspace.workspaceFolder.path
		for (const changedPath of allChangedPaths(change)) {
			if (!changedPath.startsWith(tangentFolderPath)) {

				if (this._treeChangeTimeout) {
					clearTimeout(this._treeChangeTimeout)
				}

				this._treeChangeTimeout = setTimeout(() => {
					// Pretend the query string has changed.
					this.queryInfo.value.queryString.notifyObservers(this.queryInfo.value.queryString.value)
				}, 500)

				return
			}
		}
	}

	focus(element: HTMLElement): boolean {
		const article = element?.querySelector(".QueryEditor .container article") as HTMLElement;
		if (article) {
			const selection = getInitialQuerySelection(this.queryInfo.value?.queryString.value)
			if (selection) {
				article.dispatchEvent(new SelectEvent('setSelection', { selection }))
			}
			else {
				document.getSelection().selectAllChildren(article)
			}
			return true
		}
		return false
	}

	dispose() {
		super.dispose()
		this.queryFile.unloadFile()
	}
}
