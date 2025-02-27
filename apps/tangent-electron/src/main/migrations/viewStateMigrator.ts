import path from 'path'
import fs from 'fs'
import { DirectoryStore } from 'common/trees'
import Workspace from 'main/Workspace'
import Logger from 'js-logger'

const log = Logger.get('viewstate-migrator')

export const latestViewStateVersion = 3

export default function migrate(workspace: Workspace, viewstate: any) {
	let version = viewstate.version ?? 0

	if (version === 0) {
		// The tangent map was updated
		const mapNodes = viewstate?.tangent?.mapNodes
		if (mapNodes) {
			delete viewstate.tangent.mapNodes

			const map = {} as any

			map.nodes = {}
			map.connections = []

			for (const path in mapNodes) {
				const node = mapNodes[path]
				node.strength = 1

				const outgoing = node.outgoing

				delete node.incoming
				delete node.outgoing

				map.nodes[path] = node

				for (const item of outgoing) {
					map.connections.push({
						from: path,
						to: item,
						strength: 1
					})
				}
			}

			viewstate.tangent.map = map
		}

		viewstate.version = version = 1
	}

	if (version === 1) {
		// This migration should have occured with the rest of the workspace migrations, but did not.
		// Need to update the DirectoryView data to use portable paths.
		// Needs to pre-dectect portable paths, as versioning was not updated.

		function pathToPortablePath(path) {
			if (!workspace.contentsStore.isPortablePath(path)) {
				return workspace.contentsStore.pathToPortablePath(path)
			}
			return path
		}

		function pathsToPortablePaths(paths) {
			if (!Array.isArray(paths)) return
				
			for (let i = 0; i < paths.length; i++) {
				const value = paths[i]
				if (typeof value !== 'string') {
					paths.splice(i, 1)
					i--
					continue
				}

				paths[i] = pathToPortablePath(value)
			}
		}

		function updateDirectoryView(view) {
			pathsToPortablePaths(view?.openDirectories)
			pathsToPortablePaths(view?.selection)
		}

		updateDirectoryView(viewstate?.directoryView)
		updateDirectoryView(viewstate?.tagTreeView)

		viewstate.version = version = 2
	}

	if (version === 2) {
		// 2 -> 3 is a no-op. This signifies the change from os.hostname() to better computer name.
	}
}

// This is a shim of the normal migration path
export async function migrateLegacyComputerNameWorkspaceViewState(directory: DirectoryStore, legacyFilepath: string, newFilepath: string): Promise<any> {
	const content = await fs.promises.readFile(legacyFilepath, 'utf8')
	const rawState = JSON.parse(content)
	if (!rawState.version || rawState.version <= 2) {
		log.log('Migrating workspace to new computer name')
		// Copy the old view state to the new path
		await fs.promises.cp(legacyFilepath, newFilepath)

		// Rename the old file
		const archivedName = legacyFilepath.substring(0, legacyFilepath.length - '.workspace'.length) + '_pre-migration-archive.workspace'
		await fs.promises.rename(legacyFilepath, archivedName)

		// Attempt to rename a tangent with the same name
		const legacyName = path.basename(legacyFilepath, '.workspace')
		const newName = path.basename(newFilepath, '.workspace')

		const workspacesDir = path.dirname(legacyFilepath)
		const tangentsPath = path.resolve(path.join(workspacesDir, '..', 'tangents'))

		const legacyTangentPath = path.join(tangentsPath, legacyName)
		const newTangentPath = path.join(tangentsPath, newName)

		try {
			await renameTangent(directory, legacyTangentPath, newTangentPath)
		} catch (e) {
			log.error('Renaming tangent failed', e)
		}
	}

	return content
}

async function renameTangent(directory: DirectoryStore, oldPath: string, newPath: string) {
	// Locate & rename the .tangent/tangents/<name>/etc content
	const oldName = path.basename(oldPath)
	const newName = path.basename(newPath)

	log.log('Renaming tangent from', oldName, 'to', newName)

	// Copy the files
	log.log('Copying', oldPath, 'to', newPath)
	await fs.promises.cp(oldPath, newPath, { recursive: true })

	// Rename the old files
	log.log('Archiving previous tangent')
	await fs.promises.rename(oldPath, oldPath + '_pre-migration-archive')

	const oldPathMatcher = RegExp(`^(FILES[\\\\\\/]+\.tangent[\\\\\\/]+tangents[\\\\\\/]+)(${oldName})`)

	const convertPath = (oldPath: string) => {
		const match = oldPath.match(oldPathMatcher)
		if (!match) {
			throw new Error('Could not convert path! ' + oldPath)
		}

		return match[1] + newName + oldPath.substring(match[0].length)
	}

	{
		const tangentPath = path.join(newPath, 'tangent.json')
		const tangentContent = await fs.promises.readFile(tangentPath, 'utf8')
		const tangentData = JSON.parse(tangentContent)
	
		let modified = false
		
		if (Array.isArray(tangentData.openSessions)) {
			for (let i = 0; i < tangentData.openSessions.length; i++) {
				const oldSessionPath = tangentData.openSessions[i]
				if (typeof oldSessionPath !== 'string') continue
	
				try {
					const newPath = convertPath(oldSessionPath)
					tangentData.openSessions[i] = newPath
					modified = true
				}
				catch (e) {
					log.warn('Open session path failed to convert.', e)
					tangentData.openSessions.splice(i, 1)
					i--
				}
			}
		}
	
		const oldActiveSession = tangentData.activeSession
		if (typeof oldActiveSession === 'string') {
			try {
				const newPath = convertPath(oldActiveSession)
				tangentData.activeSession = newPath
				modified = true
			}
			catch (e) {
				log.error('Active session path failed to convert. ', e)
				delete tangentData.activeSession
			}
		}
	
		if (modified) {
			log.log('Updating migrated tangent file', tangentPath)
			await fs.promises.writeFile(tangentPath, JSON.stringify(tangentData, null, '\t'), 'utf8')
		}
	}
	
	{
		const sessionDirectory = path.join(newPath, 'sessions')
		const sessions = await fs.promises.readdir(sessionDirectory)

		for (const filename of sessions) {
			if (!filename.endsWith('.tangentsession')) continue

			try {
				const sessionPath = path.join(sessionDirectory, filename)
				const content = await fs.promises.readFile(sessionPath, 'utf8')
				const sessionData = JSON.parse(content)

				if (!sessionData.previousSession || typeof sessionData.previousSession !== 'string') continue

				// We expect these files to be raw paths at version 2
				const oldPortablePath = directory.pathToPortablePath(sessionData.previousSession)
				const newPortablePath = convertPath(oldPortablePath)

				sessionData.previousSession = newPortablePath

				await fs.promises.writeFile(sessionPath, JSON.stringify(sessionData, null, '\t'), 'utf8')
				log.log('Converted contents of session:', filename)
			}
			catch (err) {
				log.warn(`Converting contents of session "${filename}" failed:`, err)
			}
		}
	}
}
