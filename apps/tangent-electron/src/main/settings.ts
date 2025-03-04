import fs from 'fs'
import path from 'path'

import { app, ipcMain, nativeTheme } from 'electron'

import Logger from 'js-logger'

import { getVersionChannel, getWorkspaceNamePrefix } from './environment'
import { applyPatch } from 'common/stores'
import Settings from 'common/settings/Settings'

let _settingsPath: string = null
export function getSettingsPath() {
	if (!_settingsPath) {
		_settingsPath = path.join(
			app?.getPath('userData') ?? '',
			getWorkspaceNamePrefix() + 'settings.json')
	}
	return _settingsPath
}

const log = Logger.get('settings')

const settings: Settings = new Settings()
let settingsLoaded = false

const settingsSubscribers: ((settings: any, patch?: any) => void)[] = []
const latestSettingsVersion = 2 // Update this when settings need migration changes

export async function loadSettings() {
	settingsLoaded = true
	// If settings are loaded outside the app environment, no reason to try
	if (app) {
		try {
			const settingsPath = getSettingsPath()
			log.info('Loading settings from: ', settingsPath)
			const text = await fs.promises.readFile(settingsPath, 'utf8')
			const data = JSON.parse(text)
			if (data.version != latestSettingsVersion) {
				log.warn('Migrating settings from', data.version, 'to', latestSettingsVersion)

				if (data.version < 2 && data.appearance) {
					function appearanceMigrator(appearance: string) {
						switch (appearance) {
							case 'Auto':
								return 'system'
							case 'Light':
								return 'light'
							case 'Dark':
								return 'dark'
						}
					}
					data.appearance = appearanceMigrator(data.appearance)
				}
			}
			settings.applyPatch(data)
			log.info('    Settings loaded')
		}
		catch (err) {
			log.error('Could not load settings')
			log.error(err)
	
			// Set up settings 
			const versionChannel = getVersionChannel()
			if (versionChannel === 'beta' || versionChannel == 'alpha') {
				settings.updateChannel.set(versionChannel)
			}
		}
	}
	
	postSettings()

	return settings
}

export async function saveSettings(sync=false) {
	try {
		const data = settings.getRawValues('file') as any
		data.version = latestSettingsVersion

		const text = JSON.stringify(data, null, '\t')
		if (sync) {
			fs.writeFileSync(getSettingsPath(), text)
		}
		else {
			await fs.promises.writeFile(getSettingsPath(), text)
		}
	}
	catch (err) {
		log.error('Settings could not be saved')
		log.error(err)
	}
}

export function getSettings() {
	if (!settingsLoaded) loadSettings()
	return settings
}

export function patchSettings(patch) {
	applyPatch(settings, patch, {
		applyToRawValues: true
	})

	// This might not be the best place, but it's not bad
	if (nativeTheme.themeSource !== settings.appearance.value) {
		nativeTheme.themeSource = settings.appearance.value as 'system' | 'light' | 'dark'
	}

	// Technically async. Dangling like this isn't ideal.
	saveSettings()

	postSettings(patch)
}

export function subscribeToSettings(handler: (settings: Settings, patch?:any) => void) {
	settingsSubscribers.push(handler)
	return () => {
		const index = settingsSubscribers.indexOf(handler)
		if (index === settingsSubscribers.length - 1) {
			settingsSubscribers.pop()
		}
		else {
			settingsSubscribers[index] = settingsSubscribers[settingsSubscribers.length - 1]
			settingsSubscribers.pop()
		}
	}
}

function postSettings(patch?) {
	for (const sub of settingsSubscribers) {
		sub(settings, patch)
	}
}

// Tests invoke this module outside of an electron context
if (ipcMain) {
	ipcMain.handle('getGlobalSettings', async (event) => {
		return settings
	})
	
	ipcMain.on('patchGlobalSettings', (event, patch) => {
		patchSettings(patch)
	})
}
