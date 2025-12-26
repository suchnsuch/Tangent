import { test, wait } from '../tangent'
import { prepForScreenshots, screenshot } from './screenshots'

test('Embeds', async ({ tangent }) => {
	const window = await tangent.firstWindow()
	await prepForScreenshots(window)

	await window.setFocusLevel(0) // Thread

	await window.setThread({
		paths: [
			'Study Help.md'
		]
	})

	await wait(2000)

	await screenshot(window, {
		path: 'embeds'
	})
})
