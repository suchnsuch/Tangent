import WorkspaceSettings from 'common/dataTypes/WorkspaceSettings'
import fs from 'fs/promises'
import Logger from 'js-logger'
import Workspace from 'main/Workspace'
import path from 'path'
import { getVersionChannel, getWorkspaceNamePrefix } from 'main/environment'
import { autoUpdater } from 'electron-updater'

const log = Logger.get('workspace')

export default async function migrate(filepath: string, defaultsFolder: string): Promise<string[]> {

	const tangentPath = path.join(filepath, Workspace.TANGENT_DIRECTORY)

	const userFacingErrors: string[] = []

	// Look for a `.tangent` folder
	try {
		await fs.stat(tangentPath)
	}
	catch (e) {
		// There is no `.tangent` folder, create from scratch
		userFacingErrors.push(... await setupFresh(filepath, defaultsFolder))
		return userFacingErrors
	}

	let backupPath: string = null

	try {
		// There is a `.tangent` folder
		const willModify = async () => {
			// Create a backup in case of issues
			if (backupPath) return // Only copy once, allowing calls past the first to no-op

			const now = new Date()
			backupPath = path.join(
				filepath,
				`${Workspace.TANGENT_DIRECTORY}_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getUTCHours()}-${now.getMinutes()}-${now.getSeconds()}`)
			log.info('Backing up workspace data to', backupPath)
				
			await fs.cp(tangentPath, backupPath, { recursive: true, preserveTimestamps: true })
		}

		// Migrate the folder up
		userFacingErrors.push(... await updateWorkspace(filepath, defaultsFolder, willModify))

		if (backupPath) {
			log.info('Migration complete')
		}
	}
	catch (e) {
		log.error('An error occured while migrating workspace data: ', e)
		userFacingErrors.push('Tangent was unable to update workspace data. Please restart Tangent or seek assistance via email or Discord.')
	}

	const updateChannel = getVersionChannel()
	const isAlphaOrBeta = updateChannel === 'alpha' || updateChannel === 'beta'

	if (!isAlphaOrBeta && backupPath && getWorkspaceNamePrefix() == '' && userFacingErrors.length === 0) {
		log.info('Removing workspace data backup')
		await fs.rm(backupPath, { recursive: true })
	}

	return userFacingErrors
}

async function setupFresh(filepath: string, defaultsFolder: string): Promise<string[]> {
	log.info('Creating new ".tangent" folder for', filepath)
	const tangentPath = path.join(filepath, Workspace.TANGENT_DIRECTORY)
	await fs.mkdir(tangentPath)

	const userFacingErrors: string[] = []

	if (defaultsFolder) {
		userFacingErrors.push(... await ensureWorkspaceSettingsExist(tangentPath, defaultsFolder))
	}

	return userFacingErrors
}

function getWorkspaceSettingsPath(tangentPath: string) {
	return path.join(tangentPath, 'workspace-settings.json')
}

async function ensureWorkspaceSettingsExist(tangentPath: string, defaultsFolder: string): Promise<string[]> {
	// Initialize workspace settings
	const workspaceSettingsPath = getWorkspaceSettingsPath(tangentPath)
	try {
		await fs.stat(workspaceSettingsPath)
	}
	catch (e) {
		const defaultWorkspaceSettingsPath = path.resolve(defaultsFolder, 'workspace-settings.json')
		log.info('Copying default workspace settings from', defaultWorkspaceSettingsPath)

		try {
			await fs.copyFile(defaultWorkspaceSettingsPath, workspaceSettingsPath)
		}
		catch (e) {
			log.error('Failed to copy default workspace settings. Tangent should be restarted.')
			return ['Tangent was unable to initiaize workspace settings. Please restart Tangent.']
		}
	}
	return []
}

async function updateWorkspace(
	filepath: string,
	defaultsFolder: string,
	willModify: () => Promise<void>
): Promise<string[]> {
	const tangentPath = path.join(filepath, Workspace.TANGENT_DIRECTORY)
	const userFacingErrors: string[] = []

	// Detect and migrate from "unversioned" versions
	let workspaceSettingsData: any = null
	const workspaceSettingsPath = getWorkspaceSettingsPath(tangentPath)

	try {
		// Check for creation rules
		const oldCreationRulePath = path.join(tangentPath, 'creation-rules.json')
		const content = await fs.readFile(oldCreationRulePath, 'utf8')
		workspaceSettingsData = JSON.parse(content)

		await willModify()

		// Delete the old creation rules
		await fs.rm(oldCreationRulePath)
	}
	catch (e) {
		// No creation rules
		try {
			// Check for workspace settings
			const content = await fs.readFile(workspaceSettingsPath, 'utf8')
			workspaceSettingsData = JSON.parse(content)
		}
		catch (e) {
			// No workspace settings either. This workspace is older than creation rules.
			// Seed updated workspace settings
			userFacingErrors.push(... await ensureWorkspaceSettingsExist(tangentPath, defaultsFolder))
		}
	}

	const firstEffectiveVersion = workspaceSettingsData?.version ?? 0
	let effectiveVersion = firstEffectiveVersion
	
	try {
		while (effectiveVersion < WorkspaceSettings.LATEST_VERSION) {
			await willModify()
			log.info('Migrating workspace from version', effectiveVersion, 'to', effectiveVersion+1)
			switch (effectiveVersion) {
				case 0:
					await version_1(tangentPath, workspaceSettingsData, userFacingErrors)
					break
			}
			effectiveVersion++
		}

		if (firstEffectiveVersion !== effectiveVersion) {
			// Clean up
			if (workspaceSettingsData) {
				await fs.writeFile(workspaceSettingsPath, JSON.stringify(workspaceSettingsData, null, '\t'), 'utf8')
			}
		}
	}
	catch (e) {
		log.error(`Failed to migrate from ${effectiveVersion} to ${effectiveVersion + 1}:`, e)
		userFacingErrors.push('Tangent failed to migrate its workspace data to the newest version. Please restart Tangent, or delete the ".tangent" folder to reset the workspace.')
	}
	

	return userFacingErrors
}

async function version_1(tangentPath: string, workspaceSettingsData: any, userFacingErrors: string[]) {
	// Move around the workspace settings
	if (workspaceSettingsData) {
		// This may not exist if the workspace is older than creation rules
		workspaceSettingsData.version = 1

		if (workspaceSettingsData.rules) {
			workspaceSettingsData.creationRules = workspaceSettingsData.rules
			delete workspaceSettingsData.rules
		}
	}
}
