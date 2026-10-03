import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

import Logger from 'js-logger'
import { getContentType } from './contentTypes'
import { rendererRoot } from './appPaths'

const log = Logger.get('app-protocol')

export const APP_PROTOCOL = 'app'
export const APP_PROTOCOL_HOST = 'tangent'

export const APP_URL = `${APP_PROTOCOL}://${APP_PROTOCOL_HOST}/index.html`

/**
 * The scheme declaration for the renderer bundle.
 *
 * In development the renderer is served by vite instead, but both are real
 * origins, so the page behaves the same either way. That is the point of this:
 * a vite build emits `<script type="module">`, and module scripts are CORS
 * checked, which an opaque `file://` origin can never satisfy. Serving the
 * bundle over a scheme of our own is what lets the renderer be code split.
 */
export const appProtocolScheme: Electron.CustomScheme = {
	scheme: APP_PROTOCOL,
	privileges: {
		standard: true,
		secure: true,
		supportFetchAPI: true,
		corsEnabled: true,
		// So that the renderer can be treated as a normal web origin
		allowServiceWorkers: false
	}
}

/**
 * Serves a file out of the built renderer.
 */
export async function handleAppProtocol(request: Request) {
	let relativePath: string
	try {
		relativePath = decodeURIComponent(new URL(request.url).pathname)
	}
	catch (e) {
		log.error('Could not interpret app url:', request.url)
		return new Response(null, { status: 400 })
	}

	if (relativePath === '' || relativePath === '/') {
		relativePath = '/index.html'
	}

	const target = path.join(rendererRoot, relativePath)

	// Chromium normalizes `..` out of standard urls before we ever see them, but
	// nothing about this handler should depend on that being true.
	if (target !== rendererRoot && !target.startsWith(rendererRoot + path.sep)) {
		log.warn('Blocked an app request that escaped the renderer root:', request.url)
		return new Response(null, { status: 403 })
	}

	let stats: fs.Stats
	try {
		stats = await fs.promises.stat(target)
		if (!stats.isFile()) {
			throw new Error('Not a file')
		}
	}
	catch (e) {
		log.error('Could not read app file:', target)
		return new Response(null, { status: 404 })
	}

	return new Response(
		Readable.toWeb(fs.createReadStream(target)) as ReadableStream,
		{
			status: 200,
			headers: {
				'Content-Type': getContentType(target),
				'Content-Length': stats.size.toString()
			}
		})
}
