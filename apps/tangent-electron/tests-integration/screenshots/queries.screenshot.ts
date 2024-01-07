import { test, wait } from '../tangent'
import { prepForScreenshots, screenshot } from './screenshots'

test('Queries', async ({ tangent }) => {
	const window = await tangent.firstWindow()
	await prepForScreenshots(window, { sizeScale: 1 })

	await window.setFocusLevel(0) // Thread

	await window.setThread({
		paths: [
			'Status.tangentquery'
		]
	})

	await wait(500)

	await screenshot(window, {
		path: 'queries'
	})
})
