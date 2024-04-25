import fs from 'fs'
import os from 'os'
import chalk from 'chalk'

import type { TreeNode } from 'common/trees'
import type { ObjectStore } from 'common/stores'

import WorkspaceTreeNode from './WorkspaceTreeNode'

import Logger from 'js-logger'

const log = Logger.get('file')
log.setLevel(Logger.INFO)

export type FileContent = string | ObjectStore | unknown

export interface FileWatcher {
	sendFileContents(filePath: string, contents: FileContent)
	postUserMessage(type: string, ...args)

	sendPatches?: boolean
}

export enum FileSaveResult {
	Failed = -1,
	Identical = 0,
	Success = 1
}

export default class File extends WorkspaceTreeNode {

	// This might eventually want to be shared with the back-end
	observers: FileWatcher[]
	contents: string

	private cachePromise: Promise<FileContent> = null
	
	constructor(node: TreeNode) {
		super(node)

		this.observers = []
	}

	addObserver(observer: FileWatcher) {
		if (!observer) {
			throw new Error('Tried to add a null observer to File:' + this.path)
		}

		if (!this.observers.includes(observer)) {
			this.observers.push(observer)
		}

		if (this.contents) {
			observer.sendFileContents(this.path, this.contents)
		}
		else {
			this.cacheFile()
		}
	}

	dropObserver(observer: FileWatcher) {
		let index = this.observers.indexOf(observer)
		if (index >= 0) {
			this.observers.splice(index, 1);
		}

		if (this.observers.length === 0) {
			this.contents = null
			if (this.state !== 'deleted') {
				this.state = 'idle'
			}
		}
	}

	async cacheFile(): Promise<FileContent> {
		if (!this.cachePromise) {
			this.cachePromise = this.cacheFileInternal()
			this.cachePromise.then(_ => {
				this.cachePromise = null
			})
		}
		
		return this.cachePromise
	}

	protected async cacheFileInternal(): Promise<FileContent> {
		// No need to cache a virtual file. We know it's not there.
		if (this.meta?.virtual) return this.contents

		log.trace('caching ' + chalk.green(this.path))
		try {
			let contents = await fs.promises.readFile(this.path, 'utf8')
			if (contents) {
				// Sanitize windows line endings
				contents = contents.replace(/\r\n/g, '\n')
			}
			if (this.contents != contents) {
				log.trace(`    "${this.name}" changed, broadcasting update`)
				log.trace(chalk.grey(contents))

				if (!contents) {
					log.trace(chalk.yellow('      Empty contents found'))
				}
				
				this.contents = contents
				
				this.state = 'loaded'

				for (let observer of this.observers) {
					observer.sendFileContents(this.path, contents)
				}
			}
			else {
				log.trace(`    "${this.name}" contents the same, skipping broadcast`)
			}
		}
		catch (err) {
			log.error(`    Could not cache "${this.name}": ` + chalk.red(err))
			if (err.code === 'ENOENT') {
				// This file has been deleted
				log.error('    ' + chalk.yellow('Broadcasting file removal'))
				this.state = 'deleted'
			}	
		}
		
		return this.contents
	}

	async initializeContents() {
		return this.setContents('')
	}

	async setContents(contents: FileContent, updater?: FileWatcher): Promise<FileSaveResult> {
		if (typeof contents !== 'string') {
			log.error('Invalid contents sent to ' + chalk.red(this.path))
			return FileSaveResult.Failed
		}
		if (contents !== null && contents !== undefined && this.contents != contents) {
			log.info('updating and saving ' + chalk.green(this.path))
			for (let observer of this.observers) {
				if (updater === observer) {
					// No need to send the content to the thing that set it
					continue
				}
				observer.sendFileContents(this.path, contents)
			}
			this.contents = contents
			try {
				if (os.EOL !== '\n') {
					// Restore gross windows line endings
					contents = contents.replace(/\n/g, os.EOL)
				}

				await fs.promises.writeFile(this.path, contents as string, 'utf8')
				this.state = 'loaded'
				return FileSaveResult.Success
			}
			catch (err) {
				log.error('Could not write', this.path, err)

				for (const observer of this.observers) {
					observer.postUserMessage(
						'error',
						'File Write Error',
						`Could not write "${this.path}" to disk.
Please copy your note elsewhere to avoid data loss and restart Tangent.
Appologies for the inconvenience.`)
				}
				return FileSaveResult.Failed
			}
		}
		return FileSaveResult.Identical
	}

	// The file has been changed from somewhere else
	onExternalChange() {
		if (this.observers.length > 0) {
			this.cacheFile()
		}
	}
}
