import { describe, test, expect, it } from 'vitest'

import * as parser from './parser'
import { TextDocument, Line, Delta } from '@typewriter/document'
import { buildOpsFromInsertList, typewriterToText } from 'common/typewriterUtils'
import { StructureType } from 'common/indexing/indexTypes'

function ensureLine(line: Line, content: string) {
	expect(line.content.ops.length).toEqual(1)
	expect(line.content.ops[0].insert).toEqual(content)
}

function ensureRoundTrip(text: string) {
	const doc = parser.markdownToTextDocument(text)
	expect(typewriterToText(doc)).toEqual(text)
	return doc
}

test('files ending in newlines', () => {
	let content = 'Some text\nwith some lines\n'
	let doc = parser.markdownToTextDocument(content)

	expect(doc.lines.length).toEqual(3)
	ensureLine(doc.lines[0], 'Some text')
	ensureLine(doc.lines[1], 'with some lines')
	expect(doc.lines[2].content.ops.length).toEqual(0)

	expect(typewriterToText(doc))
		.toEqual(content)
})

test('files without newline endings', () => {
	let content = 'Some text\nwith some lines'
	let doc = parser.markdownToTextDocument(content)

	expect(doc.lines.length).toEqual(2)
	ensureLine(doc.lines[0], 'Some text')
	ensureLine(doc.lines[1], 'with some lines')

	expect(typewriterToText(doc))
		.toEqual(content)
})

test('Multi-op lines come out clean', () => {
	let line = Line.create(new Delta([
		{ insert: "Some text " },
		{ insert: "and some more text"}
	]))

	let doc = new TextDocument([line])

	expect(typewriterToText(doc))
		.toEqual('Some text and some more text')
})

test('Ending in italics', () => {
	// Checks for a bug where this caused an infinite loop
	const doc = parser.markdownToTextDocument('This is _formatted_')
})

describe('Document-based parsing', () => {

	test('Inserting code characters on blank line', () => {
		// This was created for an infinite loop bug
		let doc = parser.markdownToTextDocument(`Some

Text`)
		let [start, end] = doc.getLineRange(doc.lines[1])
		let change = doc.change.insert(start, '`')
		let editedDoc = doc.apply(change)

		let parseResult = parser.parseMarkdown(editedDoc, {
			documentStartLine: 1,
			documentEndLine: 1
		})

		expect(parseResult.lines.length).toEqual(1)
	})

	test('Code consumption', () => {
		let doc = parser.markdownToTextDocument(`\`\`\`js
var some = code;
\`\`\`
And some text`)
		let codeEndLine = doc.lines[2]
		expect(codeEndLine.attributes.code).not.toBeFalsy()

		let textLine = doc.lines[3]

		expect(textLine.attributes.code).toBeFalsy()
		expect(textLine.content.ops[0].attributes).toEqual({})

		let [start, end] = doc.getLineRange(codeEndLine)
		// Delete the last '`'
		let change = doc.change.delete([end - 2, end - 1])
		let editedDoc = doc.apply(change)

		expect(typewriterToText(editedDoc)).toEqual(`\`\`\`js
var some = code;
\`\`
And some text`)

		let parseResult = parser.parseMarkdown(editedDoc, {
			documentStartLine: 2,
			documentEndLine: 2
		})

		expect(parseResult.lines.length).toEqual(4)

		let newTextLine = parseResult.lines[3]
		expect(newTextLine.attributes.code).toEqual({ language: 'js' })
	})

	test('Multi Code consumption', () => {
		let doc = ensureRoundTrip(`\`\`\`js
var some = code;
\`\`\`

\`\`\`js
let some = other().code
\`\`\`

And some text`)
		let codeEndLine = doc.lines[2]
		let [start, end] = doc.getLineRange(codeEndLine)
		// Delete the last '`'
		let change = doc.change.delete([end - 2, end - 1])
		let editedDoc = doc.apply(change)

		expect(typewriterToText(editedDoc)).toEqual(`\`\`\`js
var some = code;
\`\`

\`\`\`js
let some = other().code
\`\`\`

And some text`)

		let parseResult = parser.parseMarkdown(editedDoc, {
			documentStartLine: 2,
			documentEndLine: 2
		})

		expect(parseResult.lines.length).toEqual(7)

		// Don't expect "And some text" to be included; it's not code
		let newTextLine = parseResult.lines[3] 
		expect(newTextLine.attributes.code).toEqual({ language: 'js' })

		// This tests for a bug where ending the code run could
		// apply its formatting to following lines
		for (let i = 0; i < parseResult.lines.length; i++) {
			const parsedLine = parseResult.lines[i]
			const originalLine = editedDoc.lines[i]

			expect(parsedLine.length).toEqual(originalLine.length)
		}
	})
})

describe('Formatting', () => {
	it('Inline code should close out', () => {
		const { lines } = parser.parseMarkdown('Some `simple code` formatting')
		const ops = lines[0].content.ops

		expect(ops).toEqual(buildOpsFromInsertList([
			'Some ',
			'`', {
				inline_code: true,
				hidden: true,
				hiddenGroup: true,
				start: true
			},
			'simple code', {
				inline_code: true,
				hiddenGroup: true,
				afterSpace: true,
				beforeSpace: true
			},
			'`', {
				inline_code: true,
				hidden: true,
				hiddenGroup: true,
				end: true
			},
			' formatting'
		], true))
	})
})

describe('Link parsing', () => {

	describe('Wiki Links', () => {
		it('Should handle simple links', () => {
			const { lines, structure } = parser.parseMarkdown('Some [[Simple Link]] in text')
			const ops = lines[0].content.ops

			const t_link = ops[1].attributes.t_link

			expect(t_link).toEqual({
				form: 'wiki',
				href: 'Simple Link'
			})

			expect(ops).toMatchObject(buildOpsFromInsertList([
				'Some ',
				'[[', {
					t_link,
					start: true,
					hidden: true
				},
				'Simple Link', { t_link },
				']]', {
					t_link,
					end: true,
					hidden: true
				},
				' in text'
			]))

			expect(structure).toEqual([{
				type: StructureType.Link,
				start: 5, end: 20,
				form: 'wiki',
				href: 'Simple Link'
			}])
		})

		it('Should allow inline formatting in override text', () => {
			const { lines, structure } = parser.parseMarkdown('A [[Simple Link|link with _inline_ formatting]] in text')
			const ops = lines[0].content.ops

			const t_link = ops[1].attributes.t_link

			expect(ops).toMatchObject(buildOpsFromInsertList([
				'A ',
				'[[', {
					t_link,
					hidden: true
				},
				'Simple Link', {
					t_link,
					hidden: true
				},
				'|', {
					t_link,
					hidden: true
				},
				'link with ', { t_link },
				'_', {
					t_link,
					italic: true,
					hidden: true
				},
				'inline', {
					t_link,
					italic: true
				},
				'_', {
					t_link,
					italic: true,
					hidden: true
				},
				' formatting', { t_link },
				']]', {
					t_link,
					hidden: true
				},
				' in text'
			]))
		})

		it('Should support multiple links in a single line', () => {
			const result = parser.parseMarkdown('A line with [[Multiple]] [[Wiki Links]]')

			expect(result.structure).toMatchObject([
				{
					type: StructureType.Link,
					href: 'Multiple'
				},
				{
					type: StructureType.Link,
					href: 'Wiki Links'
				}
			])
		})

		// Tests that links are dropping contexts correctly
		it('Should support multiple renamed links in a single line', () => {
			const result = parser.parseMarkdown('A line with [[Multiple|some]] [[Wiki Links|renamed links]]')

			expect(result.structure).toMatchObject([
				{
					type: StructureType.Link,
					href: 'Multiple',
					text: 'some'
				},
				{
					type: StructureType.Link,
					href: 'Wiki Links',
					text: 'renamed links'
				}
			])
		})
	})

	describe('Markdown Links', () => {
		it('Should not be stomped by wiki links', () => {
			const ops = parser.parseMarkdown(`[web link](https://google.com) and a [[Wiki Link]]`).lines[0].content.ops
	
			// The first link should be seen as a markdown link
			expect(ops[0].attributes.t_link).toEqual({ form: 'md', href: 'https://google.com', text: 'web link' })
		})

		it('Should allow for inline formatting in text', () => {
			const { lines, structure } = parser.parseMarkdown('A [link with _inline_ formatting](https://google.com) in text')
			const ops = lines[0].content.ops

			const t_link = ops[1].attributes.t_link
			expect(t_link).toMatchObject({
				form: 'md',
				href: 'https://google.com',
				text: 'link with _inline_ formatting'
			})

			expect(ops).toMatchObject(buildOpsFromInsertList([
				'A ',
				'[', { t_link },
				'link with ', { t_link },
				'_', { t_link, italic: true },
				'inline', { t_link, italic: true },
				'_', { t_link, italic: true },
				' formatting', { t_link },
				'](https://google.com', { t_link },
				')', { t_link },
				' in text'
			]))
		})
	})

	describe('Raw Links', () => {
		it('Should not consume preceeding characters after a space', () => {
			const ops = parser.parseMarkdown(`raw link: https://google.com and such`).lines[0].content.ops
			expect(ops[0].attributes.t_link).toBeFalsy()
			expect(ops[0].insert).toEqual('raw link: ')
			expect(ops[1].insert).toEqual('https://google.com')
		})

		it('Should not consume preceeding characters at the start of a new line', () => {
			const ops = parser.parseMarkdown(`New line\nhttps://google.com and such`).lines[1].content.ops
			expect(ops[0].insert).toEqual('https://google.com')
		})

		it('Should not consume preceeding characters that are not letters', () => {
			const ops = parser.parseMarkdown(`]]https://google.com and such`).lines[0].content.ops
			expect(ops[1].insert).toEqual('https://google.com')
		})
	})

	it('Should not introduce new text with strange mixed wiki and markdown syntax', () => {
		ensureRoundTrip(`[[1]](https://en.wikipedia.org/wiki/Mothers'_Union#cite_note-1)`)
	})

	it('Should not introduce new text with escaped wiki in markdown syntax', () => {
		ensureRoundTrip(`[\\[1\\]](https://en.wikipedia.org/wiki/Mothers'_Union#cite_note-1)`)
	})

	it('Should not introduce new text with markdown syntax', () => {
		ensureRoundTrip(`[1](https://en.wikipedia.org/wiki/Mothers'_Union#cite_note-1)`)
	})
})

describe('Embeds', () => {
	test('Wiki embeds show up in the structure', () => {
		const result = parser.parseMarkdown(`Here we link to ![[An Image.png]]`)

		expect(result.structure).toEqual([
			{
				type: StructureType.Embed,
				form: 'wiki',
				start: 16,
				end: 33,
				href: 'An Image.png'
			}
		])
	})
})

describe('Parsed text should not be modified', () => {

	test(`Basic text`, () => {
		ensureRoundTrip(`Basic
multiline

text`)
	})

	test('Closed front matter', () => {
		ensureRoundTrip(`---
foo: bar

test
---`)
	})

	test('Unclosed front matter', () => {
		ensureRoundTrip(`---
foo: bar

test`)
	})

	test('Empty front matter', () => {
		ensureRoundTrip(`---
---
Hi there.`)
	})
	
	test('Unclosed code', () => {
		ensureRoundTrip(`\`\`\`js
let var = not_stopped()`)
	})
})

describe('Indentation', () => {
	test('Should allow for indented empty lines', () => {
		// This checks for a bug that choked after consuming indentation
		parser.parseMarkdown(`	`)
	})
})

describe('Front matter parsing', () => {
	const parsingOptions: parser.MarkdownParsingOptions = {
		parseFrontMatter: true
	}

	it('Should translate YAML', () => {
		// Note the tabs used for indentation
		const result = parser.parseMarkdown(`---
foo: bar
something: 2
list: [a, b, 3]
list2:
	- foo
	- bar
	- bat
---
And this is not yaml`, parsingOptions)

		expect(result.structure).toEqual([
			{
				type: StructureType.FrontMatter,
				start: 0,
				end: 73,
				data: {
					foo: 'bar',
					something: 2,
					list: ['a', 'b', 3],
					list2: ['foo', 'bar', 'bat']
				}
			}
		])
	})

	it('Should handle completely empty front matter', () => {
		const result = parser.parseMarkdown(`---
---
Hi there.`, parsingOptions)

		expect(result.structure).toEqual([
			{
				type: StructureType.FrontMatter,
				start: 0,
				end: 7,
				data: null
			}
		])
	})

	it('Should gracefully handle marginally inaccurate closing lines', () => {
		const result = parser.parseMarkdown(`---
test: thing
--- 
Hi there.`, parsingOptions)

		expect(result.structure).toEqual([
			{
				type: StructureType.FrontMatter,
				start: 0,
				end: 20,
				data: { test: 'thing' }
			}
		])
	})

	it('Should not throw with impropper YAML', () => {
		const result = parser.parseMarkdown(`---
dupe: 1
dupe: 2
---
Hi there.`, parsingOptions)

		expect(result.errors).toHaveLength(1)
		expect(result.structure).toEqual([
			{
				type: StructureType.FrontMatter,
				start: 0,
				end: 23,
				data: null
			}
		])
	})
})

describe('Todos', () => {
	it('Should log todos', () => {
		const result = parser.parseMarkdown(`
- Not a todo
- [ ] An unchecked todo
- [x] A checked todo
- [-] A canceled todo`)

		expect(result.structure).toEqual([
			{
				type: StructureType.Todo,
				start: 14,
				end: 37,
				state: 'open',
				text: 'An unchecked todo'
			},
			{
				type: StructureType.Todo,
				start: 38,
				end: 58,
				state: 'checked',
				text: 'A checked todo'
			},
			{
				type: StructureType.Todo,
				start: 59,
				end: 80,
				state: 'canceled',
				text: 'A canceled todo'
			}
		])
	})
})

describe('Tags', () => {
	it('Should log tags', () => {
		const result = parser.parseMarkdown(`#my-tag #another_tag`)

		expect(result.structure).toEqual([
			{
				type: StructureType.Tag,
				start: 0,
				end: 7,
				form: 'tag',
				href: 'my-tag'
			},
			{
				type: StructureType.Tag,
				start: 8,
				end: 20,
				form: 'tag',
				href: 'another_tag'
			}
		])
	})

	it('Should not find tags adjacent to text', () => {
		const result = parser.parseMarkdown(`test#tag`)
		expect(result.structure).toEqual([])
	})

	it('Should drop trailing periods from tags', () => {
		const result = parser.parseMarkdown(`Check out this #tag.`)
		expect(result.structure).toMatchObject([
			{
				href: 'tag'
			}
		])
	})
})
