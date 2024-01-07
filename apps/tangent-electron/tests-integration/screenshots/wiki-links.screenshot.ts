import { test, wait } from '../tangent'
import { prepForScreenshots, screenshot } from './screenshots'

test('Wiki Links', async ({ tangent, workspace }) => {
	const window = await tangent.firstWindow()
	await prepForScreenshots(window)

	await window.setFocusLevel(0) // Thread

	await window.setThread({
		paths: [
			'Log',
			'Log/2023/11-November/2023-11-20.md',
			'Project Zebra.md'
		],
		current: 'Log/2023/11-November/2023-11-20.md'
	})

	await wait(500)

	await window.page.evaluate(() => {
		document.querySelector('.nodeContainer.current .feed')
			.scroll({ top: 0, behavior: 'instant' })
	})

	await wait(500)

	await window.page.evaluate(() => {
		document.querySelector('.nodeContainer.current .feed')
			.scroll({ top: 1, behavior: 'instant' })
	})

	await wait(200)

	await window.setCurrentNode('Project Zebra.md')

	await wait(1000) // Need to wait for panels to settle & scroll bar to go away

	await window.shortcut('Mod+Alt+ArrowDown')

	await wait(200)

	await screenshot(window, { 
		path: 'wiki-links'
	})
})
