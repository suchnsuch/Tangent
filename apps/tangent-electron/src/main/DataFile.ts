import fs from 'fs'
import chalk from 'chalk'
import Logger from 'js-logger'

import type { TreeNode } from 'common/trees'
import { ObjectStore } from 'common/stores'
import File, { FileContent, FileSaveResult, FileWatcher } from './File'
import type DataType from 'common/dataTypes/DataType'
import type Workspace from './Workspace'
import { RESAVE_DATA_FILE } from 'common/dataTypes/DataType'

const log = Logger.get('file')
log.setLevel(Logger.INFO)

type SaveCach = {
	timeout: any
	promise: Promise<FileSaveResult>
	resolve: (value: FileSaveResult) => void
	saving: boolean
}

export default class DataFile extends File {

	dataType: DataType
	data: ObjectStore
	private patchUnobserver?: () => void

	workspace: Workspace

	saveCache: SaveCach = null
	iteration: number = -1
	savedIteration: number = -1

	constructor(workspace: Workspace, node: TreeNode, dataType: DataType) {
		super(node)

		this.workspace = workspace
		this.dataType = dataType
		this.data = null
	}

	addObserver(observer: FileWatcher): void {
		if (!this.observers.includes(observer)) {
			this.observers.push(observer)
		}

		if (this.data) {
			observer.sendFileContents(this.path, this.data)
		}
		else {
			this.cacheFile()
		}
	}

	protected async getDataFromFile(): Promise<any> {
		try {
			let contents = await fs.promises.readFile(this.path, 'utf8')
			return this.dataType.rawToPatch ? this.dataType.rawToPatch(contents) : JSON.parse(contents)
		}
		catch (err) {
			log.error('    Could not cache file: ' + chalk.red(err))
			if (err.code === 'ENOENT') {
				// This file has been deleted
				log.error('    ' + chalk.yellow('Broadcasting file removal'))
				this.state = 'deleted'
			}
		}
		// Fall back to an empty object
		return {}
	}

	protected async cacheFileInternal(): Promise<FileContent> {
		const patch = await this.getDataFromFile()
		if (this.data) {
			// Apply patch to existing data object
			this.setContents(patch)
		}
		else {
			// Initialize the data with the on-disk content
			this.setData(new this.dataType({
				store: this.workspace.contentsStore,
				file: this,
				json: patch
			}))
		}
		
		return this.data
	}

	protected setData(newData: ObjectStore) {
		if (this.data === newData) return false

		if (this.patchUnobserver) {
			this.patchUnobserver()
			this.patchUnobserver = null
		}

		this.data = newData

		this.patchUnobserver = newData.observePatch(patch => {
			log.info(chalk.yellowBright('Saving ', this.name , 'because of patch'))
			for (const observer of this.observers) {
				if (observer.sendPatches) {
					observer.sendFileContents(this.path, patch)
				}
			}

			this.writeFile()
		})

		for (const observer of this.observers) {
			observer.sendFileContents(this.path, newData)
		}

		return true
	}

	async initializeContents(): Promise<FileSaveResult> {
		log.info('Initializing contents of', this.path)
		return this.setContents(new this.dataType({
			store: this.workspace.contentsStore,
			file: this,
			json: undefined
		}))
	}

	async writeFile(): Promise<FileSaveResult> {

		this.iteration++
		log.debug(chalk.green('Iteration'), chalk.yellow(this.iteration), 'of', chalk.grey(this.path))

		if (this.saveCache?.saving) {
			await this.saveCache.promise
		}

		if (!this.saveCache) {
			let resolve = null
			const promise = new Promise<any>((res, rej) => {
				resolve = res
			})

			this.saveCache = {
				promise, resolve,
				timeout: 0,
				saving: false
			}
		}

		const cache = this.saveCache

		if (cache.timeout) {
			clearTimeout(cache.timeout)
		}
		
		cache.timeout = setTimeout(async () => {
			cache.saving = true
			let result = FileSaveResult.Failed
			try {
				log.debug('Saving Data File:', chalk.green(this.path))
				const payload = JSON.stringify(this.data.getRawValues('file') ?? {}, null, '\t')
				await fs.promises.writeFile(this.path, payload, 'utf8')
				this.savedIteration = this.iteration
				result = FileSaveResult.Success
			}
			catch (err) {
				log.error('Could not write', this.path)
				log.error(err)
			}

			cache.saving = false
			this.saveCache = null
			// Resolve after the cache has been cleared. The first task waiting on this promise
			// should be able to create a new cache
			cache.resolve(result)

		}, this.dataType.saveDelay ?? 300)

		return cache.promise
	}

	async setContents(contents: FileContent, updater?: FileWatcher): Promise<FileSaveResult> {
		if (typeof contents === 'string') {
			if (contents === RESAVE_DATA_FILE) {
				return this.writeFile()
			}
			log.error('Invalid contents sent to ' + chalk.red(this.path))
			return FileSaveResult.Failed
		}

		if (contents instanceof ObjectStore) {
			if (this.setData(contents)) {
				return this.writeFile()
			}
		}
		else if (this.data) {
			try {
				if (this.data.applyPatch(contents)) {
					for (const observer of this.observers) {
						if (observer !== updater && observer.sendPatches) {
							observer.sendFileContents(this.path, contents)
						}
					}
	
					return this.writeFile()
				}

				return FileSaveResult.Identical
			}
			catch (err) {
				log.error('The patch sent to ' + chalk.red(this.path) + ' failed to be applied.', err, '\n  patch: + ' + JSON.stringify(contents, null, 2))
				return FileSaveResult.Failed
			}
		}

		log.error('A raw object patch was sent to ' + chalk.red(this.path) + ' while it did not have an objectstore ready to be patched.')
		return FileSaveResult.Failed
	}

	onExternalChange(): void {
		if (this.iteration > this.savedIteration) {
			// We still have changes in-flight
			log.debug(chalk.yellow('Skipping external change due to changes still in flight:', chalk.gray(this.path)))
			return
		}
		super.onExternalChange()
	}
}