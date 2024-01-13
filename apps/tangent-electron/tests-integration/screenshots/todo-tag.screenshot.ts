import { test, wait } from '../tangent'
import { prepForScreenshots, screenshot } from './screenshots'

test('Todo and Tags', async ({ tangent }) => {
	const window = await tangent.firstWindow()
	await prepForScreenshots(window, { sizeScale: 1 })

	await window.setFocusLevel(0) // Thread

	await window.setThread({
		paths: [
			'Stories/Add User Feedback Portal.md'
		]
	})

	await wait(500)

	await screenshot(window, {
		path: 'todo-tag'
	})
})
