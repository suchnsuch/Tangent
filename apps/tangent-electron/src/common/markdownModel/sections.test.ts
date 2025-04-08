import { describe, it, expect } from 'vitest'

import { compareSectionDepth, findSectionLines } from './sections'
import { markdownToTextDocument } from './parser'

describe('Section Depth', () => {
	describe('Essential lines', () => {
		const doc = markdownToTextDocument(`# Header 1
## Header 2
### Header 3
Some paragraph
- Some list
- Some other list
	- Some indented list
		A twice indented line
	A once indented line
---
`)
		
		it('Sorts larger headers higher', () => {
			expect(compareSectionDepth(doc.lines[0], doc.lines[1])).toEqual(-1)
			expect(compareSectionDepth(doc.lines[2], doc.lines[1])).toEqual(1)
		})

		it('Sorts lists below paragraphs', () => {
			expect(compareSectionDepth(doc.lines[3], doc.lines[4])).toEqual(-1)
		})

		it('Sorts based on indentation', () => {
			expect(compareSectionDepth(doc.lines[5], doc.lines[6])).toEqual(-8)
			expect(compareSectionDepth(doc.lines[6], doc.lines[7])).toEqual(-8)
		})

		it('Prefers paragraphs to lists even when indented', () => {
			expect(compareSectionDepth(doc.lines[6], doc.lines[8])).toEqual(1)
		})

		it('Sorts horizontal section breaks above everything but headers', () => {
			expect(compareSectionDepth(doc.lines[0], doc.lines[9])).toEqual(-1)
			expect(compareSectionDepth(doc.lines[2], doc.lines[9])).toEqual(-1)
			expect(compareSectionDepth(doc.lines[3], doc.lines[9])).toEqual(1)
			expect(compareSectionDepth(doc.lines[4], doc.lines[9])).toEqual(1)
		})
	})

	describe('Blockquotes', () => {
		const doc = markdownToTextDocument(`A quote:
> This is a blockquote
> This is some more
>> This is a double depth blockquote
>> This is another double depth blockquote
This is normal text again`)

		it('Treats quote starts and paragraphs as the same', () => {
			expect(compareSectionDepth(doc.lines[0], doc.lines[1])).toEqual(0)
		})

		it('Treats two blockquotes at the same depth as the same', () => {
			// This technically is inaccurate, as two completely separate different
			// blockquotes will be treated as the _same_ section rather than
			// equivalent, but that is find
			expect(compareSectionDepth(doc.lines[1], doc.lines[2])).toEqual(true)
			expect(compareSectionDepth(doc.lines[3], doc.lines[4])).toEqual(true)
		})

		it('Treats deeper blockquotes as lower', () => {
			expect(compareSectionDepth(doc.lines[2], doc.lines[3])).toEqual(-1)
		})
	})

	describe('Code', () => {
		const doc = markdownToTextDocument(`Some code:
\`\`\`js
var foo = boo()
{
	Something else
}
\`\`\`

- Some list item

\`\`\`js
var other = 'doom'
\`\`\`
`)
				
		it('Treats paragraphs and code start as the same', () => {
			expect(compareSectionDepth(doc.lines[0], doc.lines[1])).toEqual(0)
		})

		it('Treats code in the same block as the same unit', () => {
			expect(compareSectionDepth(doc.lines[1], doc.lines[2])).toEqual(true)
			expect(compareSectionDepth(doc.lines[2], doc.lines[3])).toEqual(true)
			expect(compareSectionDepth(doc.lines[1], doc.lines[6])).toEqual(true)
		})

		it('Treats code from separate blocks as equivalent, but not the same unit', () => {
			expect(compareSectionDepth(doc.lines[1], doc.lines[10])).toEqual(0)
			expect(compareSectionDepth(doc.lines[2], doc.lines[11])).toEqual(0)
		})

		it('Treats list items below any code', () => {
			expect(compareSectionDepth(doc.lines[1], doc.lines[8])).toEqual(-1)
			expect(compareSectionDepth(doc.lines[2], doc.lines[8])).toEqual(-1)
		})
	})

	describe('Math', () => {
		const doc = markdownToTextDocument(`Some math:
$$
10 + 10
$$
Some other math:
$$
2 + 2
$$`)
		it('Treats math and paragraphs as equivalent', () => {
			expect(compareSectionDepth(doc.lines[0], doc.lines[1])).toEqual(0)
		})

		it('Treats the same math blocks as the same', () => {
			expect(compareSectionDepth(doc.lines[1], doc.lines[2])).toEqual(true)
			expect(compareSectionDepth(doc.lines[2], doc.lines[3])).toEqual(true)
		})

		it('Treats two different math block lines as equivalent', () => {
			expect(compareSectionDepth(doc.lines[1], doc.lines[5])).toEqual(0)
			expect(compareSectionDepth(doc.lines[2], doc.lines[6])).toEqual(0)
		})
	})
})

describe('Section Detection', () => {
	describe('Headers & Lists', () => {
		const doc = markdownToTextDocument(`# My Big Header
Some text.

## Child Header
Some other text.
- A list
	- A sub list
	- With children
- A list sibling
- And another sibling
	- And a child

## Under header
And some more paragraph text.`)
			
		it('Does not expand single-paragraph sections', () => {
			expect(findSectionLines(doc, [20, 20])).toEqual({
				lines: [doc.lines[1]],
				highest: doc.lines[1]
			})
		})
	
		it('Expands a list item to include its children', () => {
			expect(findSectionLines(doc, [66, 66])).toEqual({
				lines: doc.lines.slice(5, 8),
				highest: doc.lines[5]
			})
		})
	
		it('Does not expand a single list item with no children', () => {
			expect(findSectionLines(doc, [110, 110])).toEqual({
				lines: [doc.lines[8]],
				highest: doc.lines[8]
			})
		})
	
		it('Expands a list with the children of its earlier sibling to include its sibling', () => {
			// Selection across line 7 and 8
			expect(findSectionLines(doc, [90, 110])).toEqual({
				lines: doc.lines.slice(5, 9),
				highest: doc.lines[5]
			})
		})
	})

	it('Expands to select an entire code block', () => {
		const doc = markdownToTextDocument(`Here is some code:
\`\`\`js
var foo = boo()
foo++
\`\`\``)
		
		expect(findSectionLines(doc, [25, 25])).toEqual({
			lines: doc.lines.slice(1, 5),
			highest: doc.lines[1]
		})
	})
})
