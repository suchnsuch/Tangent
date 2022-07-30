import fs from 'fs'
import path from 'path'

import htmlToMarkdown from '../src'

async function compare(filename: string) {
	let html, markdown
	try {
		html = await fs.promises.readFile(path.join(__dirname, filename + '.html'), 'utf8')
		markdown = await fs.promises.readFile(path.join(__dirname, filename + '.md'), 'utf8')
	}
	catch (e) {
		console.log(e)
		throw `Could not load files named "${filename}".`
	}

	expect(htmlToMarkdown(html)).toEqual(markdown)
}

describe('File comparisons', () => {
	// These could be found and parsed automatically, but this is an easy way to have them be individual results.
	test('raw-test',  () => compare('raw-test'))
	test('google-docs-copy-test', () => compare('google-docs-copy-test'))
	
	// TODO: in theory, line 2 shouldn't exist, and the line 4 gap should be formed by the paragraph with the break in it
	// The style tag in the header gives margin information for the paragraphs. This could be extracted.
	test('textedit-copy-test', () => compare('textedit-copy-test'))
})