import { join } from 'path'
import { Workspace } from 'app/model'
import { wait } from '../tangent'
import type { PageScreenshotOptions } from 'playwright'
import TangentWindow from '../TangentWindow'

type PrepOptions = {
	sizeScale?: number
}

export async function prepForScreenshots(window: TangentWindow, opts?: PrepOptions) {
	
	await window.page.evaluate(() => {
		// Strip mac controls
		const bar = document.querySelector('.WindowBar')
		bar.classList.remove('mac')
	})

	const sizeScale = opts?.sizeScale ?? 1.5

	console.log({ sizeScale })

	await window.setSize({
		width: Math.floor(1024 * sizeScale),
		height: Math.floor(576 * sizeScale)
	})

	await window.shortcut('Mod+Alt+[')

	await wait(500)
}

export async function screenshot(window: TangentWindow, options: PageScreenshotOptions) {
	await window.page.evaluate(() => {
		const workspace = (document as any).workspace as Workspace
		workspace.settings.appearance.set('light')
	})

	const path = join('..', 'Tangent_Website', 'static', 'shots', options.path)

	await window.page.screenshot({
		animations: 'disabled',
		scale: 'css',
		...options,
		path: path + '-light.jpeg'
	})
	await window.page.screenshot({
		animations: 'disabled',
		scale: 'device',
		...options,
		path: path + '-light-2x.jpeg'
	})

	await window.page.evaluate(() => {
		const workspace = (document as any).workspace as Workspace
		workspace.settings.appearance.set('dark')
	})

	await window.page.screenshot({
		animations: 'disabled',
		scale: 'css',
		...options,
		path: path + '-dark.jpeg'
	})
	await window.page.screenshot({
		animations: 'disabled',
		scale: 'device',
		...options,
		path: path + '-dark-2x.jpeg'
	})
}
