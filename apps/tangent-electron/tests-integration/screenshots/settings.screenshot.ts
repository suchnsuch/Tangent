import type { Workspace } from 'app/model'
import { test, wait } from '../tangent'
import { prepForScreenshots, screenshot } from './screenshots'

test('Settings', async ({ tangent }) => {
	const window = await tangent.firstWindow()
	await prepForScreenshots(window, { sizeScale: 1 })

	await window.setFocusLevel(0) // Thread

	await window.setThread({
		paths: [
			'Expressing Thoughts is Difficult.md'
		]
	})

	await window.shortcut('Mod+,')

	await window.page.evaluate(() => {
		const workspace = (document as any).workspace as Workspace
		workspace.viewState.system.section.set('Notes')
	})
	
	await wait(500)

	await screenshot(window, {
		path: 'settings'
	})
})
