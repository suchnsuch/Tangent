import { test, wait } from '../tangent'
import { prepForScreenshots, screenshot } from './screenshots'

test('Thread', async ({ tangent, workspace }) => {
	const window = await tangent.firstWindow()
	await prepForScreenshots(window)

	await window.setFocusLevel(0) // Thread

	await window.setThread({ paths: [
		'Log/2023/11-November/2023-11-15.md',
		'Threads Record the Context of Thought.md',
		'Writing is Crystalization.md',
		'Expressing Thoughts is Difficult.md',
		'Speak in TCP, Not UDP.md'
	]})

	await wait(500)

	await window.setCurrentNode('Threads Record the Context of Thought.md')
	await window.setCurrentNode('Writing is Crystalization.md')

	await wait(1000) // Need to wait for panels to settle & scroll bar to go away

	await screenshot(window, { 
		path: 'thread'
	})

	await window.setSize({
		width: 1024 * 1.5,
		height: 576 * 1
	})

	await screenshot(window, { 
		path: 'thread-short'
	})
})
