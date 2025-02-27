import os from 'os'
import cp from 'child_process'
import { app } from 'electron'
import Logger from 'js-logger'
export const mode: string | 'production' = process.env.NODE_ENV || 'production'

const log = Logger.get('environment')

export function getWorkspaceNamePrefix() {
	if (process.env.WORKSPACE_NAME) {
		return process.env.WORKSPACE_NAME
	}
	if (mode !== 'production') {
		return process.env.DEV_WORKSPACE_NAME ?? 'dev_'
	}
	return ''
}

/**
 * @deprecated Use `getSafeComputerName()` instead.
 * This is kept for legacy conversion
 */
export function getSafeHostName() {
	return os.hostname().replace(/\./g, '-')
}

export function getComputerName() {
	try {
		switch (process.platform) {
			case 'win32':
				return process.env.COMPUTERNAME
			case 'darwin':
				return cp.execSync('scutil --get ComputerName').toString().trim()
			case 'linux':
				const prettyName = cp.execSync('hostnamectl --pretty').toString().trim()
				return prettyName || os.hostname()
		}
	}
	catch (e) {
		log.error('Failed to get computer name', e)
	}
	return os.hostname()
}

let safeComputerName: string = null
export function getSafeComputerName() {
	if (!safeComputerName) {
		safeComputerName = getComputerName()
			// Remove double & single quotes and their left/right variants
			.replace(/[\u0022\u0027\u2018\u2019\u201c\u201D]+/g, '')
			// Replace invalid chars
			.replace(/[^\w\d-_]+/g, '-')
	}
	return safeComputerName
}

type VersionChannel = 'stable' | 'beta' | 'alpha' | 'dev'

export function getVersionChannel() : VersionChannel {
	if (!app) return 'dev'
	const version = app?.getVersion() ?? 'dev'
	if (version.indexOf('beta') >= 0) return 'beta'
	if (version.indexOf('alpha') >= 0) return 'alpha'
	return 'stable'
}
