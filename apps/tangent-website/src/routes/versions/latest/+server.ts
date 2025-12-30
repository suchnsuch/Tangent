import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

import yaml from 'yaml'
import type { Build, BuildSet, SKU } from '../../types'
import { channels } from '../../types'

const root = 'https://suchnsuch-public.s3.us-east-2.amazonaws.com/Tangent/Releases/'

const requestTimeout = 1000 * 60 * 30 // 30 minutes

let lastRequest: Date = null
let resultCache: BuildSet = { }


export function _resetCache() {
	console.log('Resetting cache', lastRequest)
	resultCache = { }
	lastRequest = null
}

type YamlData = SKU & {
	files: ({
		url: string
	})[]
}

async function getYamlFromRes(res: Response) {
	if (res.ok) {
		let text = await res.text()
		return yaml.parse(text)
	}
	throw Error('Bad response from ' + res.url + ': ' + res.statusText)
}

export const GET = (async ({ url, fetch }) => {

	const result = resultCache

	const now = new Date()

	const forceReset = url.searchParams.get('reset') === 'true'

	if (forceReset || !lastRequest || now.getTime() - lastRequest.getTime() > requestTimeout) {
		console.log('fetching!')
		lastRequest = now

		const channelTasks = channels.map(async (channel): Promise<void> => {

			// The root folder for the channel
			let channelRoot = root
			// The root name for version files
			let channelName = channel

			if (channel === 'legacy') {
				// Legacy builds live elsewhere and act like stable builds
				channelRoot = root + 'Legacy/'
				channelName = 'latest'
			}

			const getFullPath = (fileName: string) => {
				return channelRoot + fileName
			}

			const winBaseTask = fetch(getFullPath(`${channelName}.yml`))
				.then(getYamlFromRes)

			const winTask = winBaseTask
				.then(d => {
					let data = { ...d } as YamlData
					data.os = 'win'
					data.displayName = 'Windows'
					data.path = getFullPath(data.path)
					return data
				})

			const winPortableTask = winBaseTask
				.then(d => {
					let data = { ...d } as YamlData
					data.os = 'win_portable'
					data.displayName = 'Windows (Portable)'
					data.path = getFullPath(data.path).replace('Setup', 'Portable')
					return data
				})

			const macTask = fetch(getFullPath(`${channelName}-mac.yml`))
				.then(getYamlFromRes)
				.then((data: YamlData) => {
					data.os = 'mac'
					data.displayName = 'Mac'

					let nextPath = getFullPath(data.path)

					if (data.files) {
						for (const file of data.files) {
							if (file.url.endsWith('.dmg')) {
								nextPath = getFullPath(file.url)
								break
							}
						}
					}

					data.path = nextPath
					return data
				})
			
			const linuxTask = fetch(getFullPath(`${channelName}-linux.yml`))
				.then(getYamlFromRes)
				.then((data: YamlData) => {
					data.os = 'linux'
					data.displayName = 'Linux (x64 AppImage)',
					data.path = getFullPath(data.path)
					return data
				})
			
			const linux_armTask = fetch(getFullPath(`${channelName}-linux-arm64.yml`))
				.then(getYamlFromRes)
				.then((data: YamlData) => {
					data.os = 'linux_arm64'
					data.displayName = 'Linux (Arm64 AppImage)',
					data.path = getFullPath(data.path)
					return data
				})

			const tasks = await Promise.allSettled([
				winTask, winPortableTask, macTask, linuxTask, linux_armTask
			])

			const build: Build = {
				version: null,
				releaseDate: null,
				skus: {}
			}

			for (const skuResult of tasks) {
				if (skuResult.status === 'fulfilled') {
					const sku = skuResult.value
					if (!build.version && sku.version) {
						build.version = sku.version
						build.releaseDate = sku.releaseDate
					}
					build.skus[sku.os] = sku
				}
			}

			if (build.version) {
				result[channel] = build
			}
			else {
				console.error(`No build was found for ${channel}:`, tasks.map(t => {
					return t.status === 'rejected' ? t.reason : ''
				}))
			}
		})

		await Promise.all(channelTasks)
	}
	else {
		console.log('Using cache', lastRequest)
	}

	return json(result, {
		headers: {
			// Cache these results, as per: https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching
			'Cache-Control': 'max-age=0, s-maxage=600, stale-while-revalidate'
		}
	})

}) satisfies RequestHandler