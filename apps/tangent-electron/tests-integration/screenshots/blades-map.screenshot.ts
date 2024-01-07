import { test, wait } from '../tangent'
import { prepForScreenshots, screenshot } from './screenshots'

test('Blades Map', async ({ tangent, workspace}) => {
	const window = await tangent.firstWindow()
	await prepForScreenshots(window)

	await window.setThread({
		root: 'Blades',
		paths: [
			'Log/2023/10-October/2023-10-22.md',
			'The Sunken.md',
			'Anat.md'
		]
	})

	await window.addConnections({
		connections: [
			{
				from: 'Blades/The Sunken.md',
				to: 'Bombay.md',
				strength: 1
			},
			{
				from: 'Blades/Anat.md',
				to: 'Spirit Warden.md',
				strength: 1
			},
			{
				from: 'Blades/Anat.md',
				to: 'Bombay.md',
				strength: 1
			}
		]
	})

	await window.setThread({
		root: 'Blades',
		paths: [
			'Log/2023/10-October/2023-10-22.md',
			'The Sunken.md',
			'Arvo Daltless.md'
		]
	})

	await window.setThread({
		root: 'Blades',
		paths: [
			'Log/2023/10-October/2023-10-22.md',
			'The Sunken.md',
			'Naria Helles.md'
		]
	})

	await window.setThread({
		root: 'Blades',
		paths: [
			'Log/2023/10-October/2023-10-22.md',
			'The Sunken.md',
			'Bastion.md'
		]
	})

	await window.setFocusLevel(-1) // Map

	await window.addConnections({
		connections: [
			{
				from: 'Blades/Log/2023/10-October/2023-10-22.md',
				to: 'The Docks.md',
				strength: 1
			},
			{
				from: 'Blades/Log/2023/10-October/2023-10-22.md',
				to: 'The Wraiths.md',
				strength: 1
			},
			{
				from: 'Blades/Log/2023/10-October/2023-10-22.md',
				to: 'The Silkshore.md',
				strength: 1
			},
			{
				from: 'Blades/Log/2023/10-October/2023-10-22.md',
				to: 'The Gondoliers.md',
				strength: 1
			},
		],
	})

	await window.addConnections({
		connections: [
			{
				from: 'Blades/The Sunken.md',
				to: 'The Docks.md',
				strength: 1
			},
			{
				from: 'Blades/The Sunken.md',
				to: 'The Silkshore.md',
				strength: 1
			},
			{
				from: 'Blades/The Sunken.md',
				to: 'The Bluecoats.md',
				strength: 1
			},
			{
				from: 'Blades/The Sunken.md',
				to: 'Blades/Laroze.md',
				strength: 3
			},
			{
				from: 'Blades/Laroze.md',
				to: 'The Bluecoats.md',
				strength: 3
			},
			{
				from: 'Blades/Bastion.md',
				to: 'The Docks.md',
				strength: 1
			}
		]
	})

	await window.setThread({
		root: 'Blades',
		paths: [
			'Log/2023/10-October/2023-10-22.md',
			'The Sunken.md',
			'Bastion.md',
			'Captain Elshvader.md'
		]
	})

	await window.addConnections({
		connections: [
			{
				from: 'Blades/Captain Elshvader.md',
				to: 'The Windswept.md',
				strength: 1
			}
		]
	})

	await window.page.evaluate(() => {
		document.querySelector('.MapsView').scroll({ top: 800, behavior: 'instant' })
	})

	await wait(300)

	await screenshot(window, {
		path: 'blades-map'
	})
})
