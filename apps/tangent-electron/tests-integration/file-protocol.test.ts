import { test, expect } from './tangent'

import fs from 'fs'
import path from 'path'

/**
 * Workspace files reach the renderer over the `tangent-file://` protocol.
 *
 * These cover the things a bare filesystem path used to get for free by virtue
 * of the document being loaded from `file://`, plus the range support that
 * `file://` never actually provided.
 */

// A 1x1 png, so that <img> has something real to decode
const onePixelPng = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64')

/** Names that have historically been the ones to break */
const awkwardNames = [
	'plain.png',
	'a #1 image.png',
	'100% image.png',
	'what? image.png',
	'a folder with emoji 😊/an image 👌.png',
	'diacritics café.png'
]

async function writeImages(workspace: string) {
	for (const name of awkwardNames) {
		const target = path.join(workspace, name)
		await fs.promises.mkdir(path.dirname(target), { recursive: true })
		await fs.promises.writeFile(target, onePixelPng)
	}
}

test('Workspace files are served over the file protocol', async ({ tangent, workspace }) => {
	await writeImages(workspace)

	const window = await tangent.firstWindow()

	const results = await window.page.evaluate(async ([workspace, names]) => {
		const api = (window as any).api
		const out = []

		for (const name of names) {
			const url = api.file.getUrl(workspace + '/' + name, 1234)
			const entry: any = { name, url }

			const response = await fetch(url)
			entry.status = response.status
			entry.bytes = (await response.arrayBuffer()).byteLength

			// Element loads take a different path through chromium than fetch()
			entry.rendered = await new Promise(resolve => {
				const img = new Image()
				img.onload = () => resolve(img.naturalWidth)
				img.onerror = () => resolve(0)
				img.src = url
				setTimeout(() => resolve(-1), 5000)
			})

			out.push(entry)
		}

		return out
	}, [workspace, awkwardNames] as [string, string[]])

	for (const result of results) {
		expect(result, `${result.name} should be served`).toMatchObject({
			status: 200,
			bytes: onePixelPng.byteLength,
			rendered: 1
		})
	}
})

test('The file protocol answers range requests', async ({ tangent, workspace }) => {
	// Something big enough to ask for a slice of
	const contents = Buffer.alloc(4096, 7)
	await fs.promises.writeFile(path.join(workspace, 'ranged.mp4'), contents)

	const window = await tangent.firstWindow()

	const result = await window.page.evaluate(async ([workspace]) => {
		const api = (window as any).api
		const url = api.file.getUrl(workspace + '/ranged.mp4')

		const response = await fetch(url, { headers: { Range: 'bytes=100-199' } })
		return {
			status: response.status,
			contentRange: response.headers.get('Content-Range'),
			acceptRanges: response.headers.get('Accept-Ranges'),
			bytes: (await response.arrayBuffer()).byteLength
		}
	}, [workspace] as [string])

	// A 200 with a truncated body would leave <video> unable to seek
	expect(result).toEqual({
		status: 206,
		contentRange: 'bytes 100-199/4096',
		acceptRanges: 'bytes',
		bytes: 100
	})
})

test('The file protocol reports missing files', async ({ tangent, workspace }) => {
	const window = await tangent.firstWindow()

	const status = await window.page.evaluate(async ([workspace]) => {
		const api = (window as any).api
		const response = await fetch(api.file.getUrl(workspace + '/nothing-here.png'))
		return response.status
	}, [workspace] as [string])

	expect(status).toEqual(404)
})
