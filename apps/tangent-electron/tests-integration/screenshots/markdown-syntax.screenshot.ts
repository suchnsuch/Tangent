import { test, wait } from '../tangent'
import { prepForScreenshots, screenshot } from './screenshots'

test('Markdown Syntax', async ({ tangent }) => {
	const window = await tangent.firstWindow()
	await prepForScreenshots(window)

	await window.setFocusLevel(0) // Thread

	await window.setThread({
		paths: [
			'Some Thoughts.md'
		]
	})

	await wait(500)
	
	await window.keyboard.press('ArrowDown')

	await screenshot(window, {
		path: 'markdown-syntax'
	})
})
