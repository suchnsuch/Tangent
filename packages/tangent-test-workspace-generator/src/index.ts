import fs from 'fs'
import path from 'path'
import { LoremIpsum } from 'lorem-ipsum'

import yargs from 'yargs'

yargs.
command('generate [path]', 'Generate the contents of a workspace at a given path', yargs => 
	yargs.positional('path', {
		type: 'string',
		default: '.',
		describe: 'The path in which to generate the workspace'
	}).option('fileCount', {
		alias: 'f',
		type: 'number',
		default: 100,
		describe: 'The number of files to generate'
	}).option('tagCount', {
		alias: 't',
		type: 'number',
		default: 20,
		describe: 'The number of tags to generate.'
	})
, async argv => {
	const root = path.resolve(argv.path)

	await fs.promises.mkdir(root)

	const { fileCount, tagCount } = argv

	const titleGenerator = new LoremIpsum({
		wordsPerSentence: {
			min: 1, max: 5
		}
	})

	const bodyGenerator = new LoremIpsum()

	const createdTitles = new Set<string>()
	function createTitle() {
		for (let titleIndex = 0; titleIndex < 10; titleIndex++) {
			const title = titleGenerator.generateSentences(1)
			if (!createdTitles.has(title)) {
				createdTitles.add(title)
				// Trim off the trailing '.' from the Lorem-Ipsum
				return title.substring(0, title.length - 1)
			}
		}

		return null
	}

	// Get tag collections
	const tags = new Set<string>()
	for (let tagIndex = 0; tagIndex < tagCount; tagIndex++) {
		for (let tryIndex = 0; tryIndex < 10; tryIndex++) {
			const word = bodyGenerator.generator.pluckRandomWord()
			if (!tags.has(word)) {
				tags.add(word)
				break
			}
		}
	}

	// Create a regex that matches all tag words
	const tagMatch = new RegExp('\\b(' + [...tags].join('|') + ')\\b', 'ig')

	const contents = new Map<string, string>()
	for (let fileIndex = 0; fileIndex < fileCount; fileIndex++) {
		const title = createTitle()
		if (!title) continue

		const filePath = path.join(root, title + '.md')

		const paragraphCount = 1 + Math.round(Math.random() * 10)
		const bodyCopy = bodyGenerator.generateParagraphs(paragraphCount)
			.replaceAll('\n', '\n\n')
			.replaceAll(tagMatch, found => {
				return '#' + found
			})
		contents.set(filePath, bodyCopy)
	}
	
	let promises = []

	for (const [path, body] of contents) {
		promises.push(fs.promises.writeFile(path, body))
	}

	await Promise.all(promises)
})
.demandCommand()
.help()
.argv