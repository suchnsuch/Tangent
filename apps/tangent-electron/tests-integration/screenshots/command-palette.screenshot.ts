import { test, wait } from '../tangent'
import { prepForScreenshots, screenshot } from './screenshots'

test('Command Palette', async ({ tangent }) => {
	const window = await tangent.firstWindow()
	await prepForScreenshots(window, { sizeScale: 1.5 })

	await window.setFocusLevel(0) // Thread

	await window.setThread({
		paths: [
			'Some Thoughts.md'
		]
	})

	await window.shortcut('Mod+P')
	await window.keyboard.press('p')
	
	await wait(500)

	await screenshot(window, {
		path: 'command-palette'
	})
})
