import { test, expect } from './tangent'
import { LoremIpsum } from 'lorem-ipsum'

import * as stats from '../src/common/stats'
import type TangentApp from './TangentApp'

interface TestConfig {
	name: string
	initialParagraphs: number
	iterationCount?: number
}

interface TestResult {
	mean: number,
	high100th: number,
	high1000th: number,
	max: number
}

async function testTypingPerformance(tangent: TangentApp, config: TestConfig): Promise<TestResult> {
	const { name, initialParagraphs } = config
	const iterationCount = (config.iterationCount ?? 1000) + 1

	const window = await tangent.firstWindow()
	const { keyboard } = window

	await window.waitForReady()
	await window.createAndOpenFileNamed(name)

	if (initialParagraphs > 0) {
		const lorem = new LoremIpsum()
		await window.setCurrentEditorText(lorem.generateParagraphs(initialParagraphs))
	}
	
	let times = []

	for (let i = 0; i < iterationCount; i++) {
		const start = await window.getPerfTime()
		await keyboard.press('a')
		const end = await window.getPerfTime()
		if (i > 0) // Ignore the first number to drop startup costs
			times.push(end - start)
	}

	const mean = stats.mean(times)
	const high100th = stats.percentRange(times, .99, 1)
	const high1000th = stats.percentRange(times, .999, 1)
	const max = Math.max(...times)

	const result: TestResult = {
		mean,
		high100th, high1000th,
		max
	}

	//await fs.promises.writeFile(path.join(__dirname, name + '.txt'), times.join('\n'), 'utf8')

	console.log(name, result)
	return result
}

test('Small file performance', async ({ tangent }) => {
	const { mean, high100th, high1000th } = await testTypingPerformance(tangent, {
		name: 'Small Typing Test',
		initialParagraphs: 0
	})

	expect(mean).toBeLessThan(2)
	expect(high100th).toBeLessThan(4)
	expect(high1000th).toBeLessThan(6)
})

test('Medium File Performance', async ({ tangent }) => {
	const { mean, high100th, high1000th } = await testTypingPerformance(tangent, {
		name: 'Medium Typing Test',
		initialParagraphs: 100
	})
	
	// Slightly more generous
	expect(mean).toBeLessThan(3)
	expect(high100th).toBeLessThan(5)
	expect(high1000th).toBeLessThan(7)
})

test('Large File Performance', async ({ tangent }) => {
	const { mean, high100th, high1000th } = await testTypingPerformance(tangent, {
		name: 'Large Typing Test',
		initialParagraphs: 1000
	})

	// Much more generous here...
	expect(mean).toBeLessThan(9)
	expect(high100th).toBeLessThan(14)
	expect(high1000th).toBeLessThan(16)
})
