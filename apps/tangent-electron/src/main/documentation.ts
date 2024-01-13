import fs from 'fs'
import path from 'path'
import { app, ipcMain } from 'electron'
import { satisfies, compareBuild } from 'semver'
import { getWindowHandle, getWorkspace } from './workspaces'
import AdmZip from 'adm-zip'
import Logger from 'js-logger'
import type WindowHandle from './WindowHandle'
import { getOrCreateWindowForWorkspace } from './windows'
import { getWorkspaceNamePrefix } from './environment'

const log = Logger.get('documentation')

const lastVersionPath = path.join(
	app.getPath('userData'),
	getWorkspaceNamePrefix() + 'last_version.txt'
)

let documentationHandle: WindowHandle = null

export function getDocumentationPath() {
	return path.join(app.getPath('userData'), 'Documentation')
}

function getChangelogPath() {
	return path.join(getDocumentationPath(), 'Changelog')
}

function getDocumentationSourcePath() {
	return path.resolve(path.join(__dirname, '../../__build', 'documentation.zip'))
}

export async function initDocumentation(force = false) {
	const docPath = getDocumentationPath()
	const versionPath = path.join(docPath, 'version.txt')
	let currentDocVersion = ''
	try {
		currentDocVersion = await fs.promises.readFile(versionPath, 'utf-8')
	}
	catch (err) {
		currentDocVersion = ''
	}

	const currentAppVersion = app.getVersion()

	if (currentDocVersion !== currentAppVersion || force) {
		try {
			log.info(`Updating documentation from ${currentDocVersion} to ${currentAppVersion}`)
			await fs.promises.rm(docPath, {
				recursive: true,
				force: true
			})

			const docSource = getDocumentationSourcePath()
			const docCopy = path.join(app.getPath('userData'), 'documentation.zip')
			log.info(`  Copying documentation zip from ${docSource} to ${docCopy}`)
			await fs.promises.copyFile(docSource, docCopy)
			log.info(`  Loading zip file at ${docCopy}`)
			const zip = new AdmZip(docCopy)
			log.info(`  Extracting zipped documentation to ${docPath}`)
			zip.extractAllTo(docPath)
			log.info(`  Writing version file`)
			await fs.promises.writeFile(versionPath, currentAppVersion)
			log.info(`  Cleaning up`)
			await fs.promises.rm(docCopy)
			log.info(`Documentation update complete`)
		}
		catch (err) {
			log.error('Could not set up documentation.')
			log.error(err)
		}
	}
}

export function openDocumentation(name: string) {
	const docPath = getDocumentationPath()

	if (!documentationHandle) {
		const window = getOrCreateWindowForWorkspace(docPath)
		window.on('closed', () => {
			documentationHandle = null
		})
		documentationHandle = getWindowHandle(window)
	}

	documentationHandle.window.show()

	documentationHandle.whenReady().then(handle => {
		handle.navigateTo(name, 'wiki')
	})
}

let _changelogs: string[] = null
async function getChangelogs() {
	if (_changelogs === null) {
		_changelogs = []
		try {
			const files = await fs.promises.readdir(getChangelogPath())
			for (const file of files) {
				if (!file.endsWith('.md') || !file.startsWith('v')) continue
				_changelogs.push(file.substring(0, file.length - 3))
			}
		}
		catch (e) {
			log.error('Could not read changelog directory', e)
		}

		// Sort logs in descending order
		_changelogs.sort((a, b) => {
			try {
				return -compareBuild(a, b)
			}
			catch (e) {
				return 0
			}
		})
	}
	return _changelogs
}

let _recentChanges: string[] = null
let _wasNewChanges = false
async function getRecentChanges() {
	if (_recentChanges === null) {
		const thisVersion = app.getVersion()
		let cachedLastVersion: string = null
		let cachedThisVersion: string = null
		try {
			const fileData = await fs.promises.readFile(lastVersionPath, 'utf8')
			const versions = fileData.split(' ')
			if (versions.length != 2) throw 'nope'

			cachedLastVersion = versions[0]
			cachedThisVersion = versions[1]
		}
		catch {
			// Treat as a new install. It probably is.
			cachedLastVersion = thisVersion
			cachedThisVersion = thisVersion
		}

		let lastVersion = cachedLastVersion

		if (cachedThisVersion != thisVersion) {
			// This is an update
			lastVersion = cachedThisVersion
		}
		
		const versionRange = `>${lastVersion} <=${thisVersion}`

		const changelogs = lastVersion != thisVersion ? (await getChangelogs()).filter(v => {
			return satisfies(v, versionRange, {
				includePrerelease: true
			})
		}) : []

		if (cachedThisVersion != thisVersion) {
			_wasNewChanges = true
		}

		if (thisVersion != cachedThisVersion || cachedLastVersion == cachedThisVersion) {
			try {
				await fs.promises.writeFile(
					lastVersionPath,
					`${lastVersion} ${thisVersion}`,
					'utf8')
			}
			catch (e) {
				log.error('Could not mark last viewed documentation version')
			}
		}
		_recentChanges = changelogs
	}
	return _recentChanges	
}

async function getDocumentation(wikiLink) {
	const documentationWorkspace = await getWorkspace(getDocumentationPath())
	const target = documentationWorkspace.contentsStore.getMatchesForPath(wikiLink, { bestOnly: true })

	if (!target || Array.isArray(target)) {
		return null
	}
	
	const title = target.name
	const content = await documentationWorkspace.getFileContents(target.path)

	return { title, content }
}

export async function shouldShowChangelog() {
	await getRecentChanges()
	// Holy gross side-effects, Batman!
	return _wasNewChanges
}

if (ipcMain) {
	ipcMain.handle('documentation', (event, action, ...params) => {
		switch (action) {
			case 'open':
				return openDocumentation(params[0])
			case 'get':
				return getDocumentation(params[0])
			case 'getChangelogs':
				return getChangelogs()
			case 'getRecentChanges':
				return getRecentChanges()
			
		}
	})
}
