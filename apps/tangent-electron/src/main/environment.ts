import os from 'os'
import { app } from 'electron'
export const mode: string | 'production' = process.env.NODE_ENV || 'production'

export function getWorkspaceNamePrefix() {
	if (process.env.WORKSPACE_NAME) {
		return process.env.WORKSPACE_NAME
	}
	if (mode !== 'production') {
		return process.env.DEV_WORKSPACE_NAME ?? 'dev_'
	}
	return ''
}

export function getSafeHostName() {
	return os.hostname().replace(/\./g, '-')
}

type VersionChannel = 'stable' | 'beta' | 'alpha' | 'dev'

export function getVersionChannel() : VersionChannel {
	if (!app) return 'dev'
	const version = app?.getVersion() ?? 'dev'
	if (version.indexOf('beta') >= 0) return 'beta'
	if (version.indexOf('alpha') >= 0) return 'alpha'
	return 'stable'
}
