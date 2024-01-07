import { test, wait } from '../tangent'
import { prepForScreenshots, screenshot } from './screenshots'

test('Focus Mode', async ({ tangent, workspace }) => {
	const window = await tangent.firstWindow()
	await prepForScreenshots(window, { sizeScale: 1 })

	await window.setFocusLevel(4) // Sentence

	await window.setThread({
		paths: [
			'Manuscript/The Delivery.md'
		]
	})

	await wait(1500)

	for (let i = 0; i < 28; i++) {
		await window.keyboard.press('ArrowDown')
	}

	for (let i = 0; i < 12; i++) {
		await window.keyboard.press('ArrowRight')
	}

	await wait(100)

	await screenshot(window, { 
		path: 'focus-mode',
		caret: 'initial'
	})
})
