import { wait } from '@such-n-such/core'
import { markdownToTextDocument } from 'common/markdownModel'
import MarkdownEditor from './MarkdownEditor'

describe('List Handling', () => {

	let editor: MarkdownEditor
	const waitTime = 1

	beforeEach(() => {
		editor = new MarkdownEditor(null)
		editor.setRoot(document.createElement('div'))
		editor.select(0)
	})

	it('Should transform list prefixes', async () => {

		editor.doc = markdownToTextDocument(`
	- A simple
	- Tabbed
	- and dashed
	- list`)

		editor.change
			.delete([2, 3])
			.insert(2, '1.')
			.apply()

		await wait(waitTime)
		
		expect(editor.getText()).toEqual(`
	1. A simple
	2. Tabbed
	3. and dashed
	4. list`)
		
		editor.change
			.delete([2, 4])
			.insert(2, 'A.')
			.apply()

		await wait(waitTime)

		expect(editor.getText()).toEqual(`
	A. A simple
	B. Tabbed
	C. and dashed
	D. list`)
	})

	test('Merging different list types should not die', async () => {
		editor.doc = markdownToTextDocument(`
1. A simple
2. List

- with two
- kinds`)

		editor.delete([21, 22])

		await wait(waitTime)

		expect(editor.getText()).toEqual(`
1. A simple
2. List
3. with two
4. kinds`)
	})

	test('Converting numbered to bullets should not die', async () => {
		editor.doc = markdownToTextDocument(`
1. A simple
2. ordered
3. List`)

		editor.select([1, 3])
		editor.insert('*')

		await wait(waitTime)

		expect(editor.getText()).toEqual(`
* A simple
* ordered
* List`)
	})

	test('Converting numbered to bullets should not be overwritten', async () => {
		editor.doc = markdownToTextDocument(`
1. A simple
2. ordered
3. List`)

		editor.select(3)
		editor.delete(-1)
		await wait(waitTime)
		// This change makes lower items rebasis themselves
		expect(editor.getText()).toEqual(`
1 A simple
1. ordered
2. List`)

		editor.delete(-1)
		await wait(waitTime)
		expect(editor.getText()).toEqual(`
 A simple
1. ordered
2. List`)

		editor.insert('*')

		await wait(waitTime)

		expect(editor.getText()).toEqual(`
* A simple
* ordered
* List`)
	})

	test('Converting bullets to numbers should not be overwritten', async () => {
		editor.doc = markdownToTextDocument(`
* A simple
* unordered
* List`)

		editor.select(2)
		editor.delete(-1)
		await wait(waitTime)
		expect(editor.getText()).toEqual(`
 A simple
* unordered
* List`)

		editor.insert('1')
		await wait(waitTime)
		editor.insert('.')
		await wait(waitTime)

		expect(editor.getText()).toEqual(`
1. A simple
2. unordered
3. List`)
	})

	test('Untabbing from one level to the other should retain cursor position relative to prefix', async () => {
		editor.doc = markdownToTextDocument(`
1. A simple
2. ordered
	* Bullet
	* List`)

		editor.select(37) // Just before 'List' in the last line
		let start = editor.doc.selection[0]
		let text = editor.doc.getText([start, editor.doc.length - 1])
		expect(text).toEqual('List')
		
		editor.outdent()
		await wait(waitTime)

		expect(editor.getText()).toEqual(`
1. A simple
2. ordered
	* Bullet
3. List`)

		start = editor.doc.selection[0]
		text = editor.doc.getText([start, editor.doc.length - 1])
		expect(text).toEqual('List')

		// Reversing the process should also work
		editor.indent()
		await wait(waitTime)

		expect(editor.getText()).toEqual(`
1. A simple
2. ordered
	* Bullet
	* List`)

		start = editor.doc.selection[0]
		text = editor.doc.getText([start, editor.doc.length - 1])
		expect(text).toEqual('List')
		
	})

	test('Long numberd lists should not break when modified', async () => {
		editor.doc = markdownToTextDocument(`
1. One
2. Two
3. Three
4. Four
5. Five
6. Six
7. Seven
8. Eight
9. Nine
1. Ten
2. Eleven
3. Twelve
4. Thirteen
5. Fourteen
6. Fifteen
7. Sixteen
8. Seventeen
9. Eighteen
10. Nineteen
11. Twenty`)

		// Change "1. Ten" to "10. Ten"
		editor.select(74)
		editor.insert('0')

		// Wait for list validation to propegate
		await wait(waitTime)

		expect(editor.getText()).toEqual(`
1. One
2. Two
3. Three
4. Four
5. Five
6. Six
7. Seven
8. Eight
9. Nine
10. Ten
11. Eleven
12. Twelve
13. Thirteen
14. Fourteen
15. Fifteen
16. Sixteen
17. Seventeen
18. Eighteen
19. Nineteen
20. Twenty`)
	})

	it('Should not destroy pasted list text', async () => {
		editor.doc = markdownToTextDocument(``)

		editor.select(0)
		editor.modules.paste.commands.paste({ text: `1. One
2. Two
3. Three
4. Four` 
})
		await wait(waitTime)

		expect(editor.getText()).toEqual(`1. One
2. Two
3. Three
4. Four`)
	})
	
	describe('Checkboxes', () => {

		it('Should allow checkboxes to indent unmolested', async () => {
			editor.doc = markdownToTextDocument(`
	- [ ] An unchecked list item`)

			editor.select(7)
			editor.indent()
			await wait(waitTime)

			expect(editor.getText()).toEqual(`
		- [ ] An unchecked list item`)
		})

		it('Should toggle checkboxes on', async () => {
			editor.doc = markdownToTextDocument(`
	- [ ] An unchecked list item`)

			await wait(waitTime)

			editor.modules.tCheckbox.toggleCheckboxOnLine(editor.doc.lines[1])

			await wait(waitTime)

			expect(editor.getText()).toEqual(`
	- [x] An unchecked list item`)
		})

		it('Should toggle empty checkboxes on', async () => {
			editor.doc = markdownToTextDocument(`
	- [] An unchecked list item`)

			await wait(waitTime)

			editor.modules.tCheckbox.toggleCheckboxOnLine(editor.doc.lines[1])

			await wait(waitTime)

			expect(editor.getText()).toEqual(`
	- [x] An unchecked list item`)
		})
		
		it('Should toggle checkboxes off', async () => {
			editor.doc = markdownToTextDocument(`
	- [x] A checked list item`)

			await wait(waitTime)

			editor.modules.tCheckbox.toggleCheckboxOnLine(editor.doc.lines[1])

			await wait(waitTime)

			expect(editor.getText()).toEqual(`
	- [ ] A checked list item`)
		})

		it('Should let you delete a checkbox without causing pain', async () => {
			editor.doc = markdownToTextDocument(`
	- [x] An unchecked list item
	- [ ] Test
	- [ ] `)
			await wait(waitTime)

			editor.select(editor.doc.length - 1)
			editor.delete(-1)
			
			await wait(waitTime)

			expect(editor.getText()).toEqual(`
	- [x] An unchecked list item
	- [ ] Test
	- [ ]`)
		})
			
	})


	// Can't get this one to give the right result. Because of the fake enter?
// 	it('Should not duplicate list markup when newlining within list markup', async () => {
// 		editor.doc = markdownToTextDocument(`* A simple
// * List`)

// 		await wait(500)

// 		editor.select(0) // Start of first bullet

// 		await wait(500)

// 		// Fake enter
// 		editor.root.dispatchEvent(new KeyboardEvent('keydown', {
// 			bubbles: true,
// 			key: 'Enter'
// 		}))

// 		await wait(500)

// 		console.log('-----' + editor.getText() + '\n------')
// 		expect(editor.getText()).toEqual(`
// * A simple
// * List`)
// 	})
})

describe('Comment Toggling', () => {

	let editor: MarkdownEditor
	const waitTime = 1

	beforeEach(() => {
		editor = new MarkdownEditor(null)
		editor.setRoot(document.createElement('div'))
		editor.select(0)
	})

	it('Should toggle on an entire line if no comment is present', async () => {
		editor.doc = markdownToTextDocument(`
This is an uncommented line`)
		editor.select(7)
		await wait(waitTime)
		editor.modules.tangent.toggleLineComment()

		expect(editor.getText()).toEqual(`
//This is an uncommented line`)
		expect(editor.doc.selection).toEqual([9, 9])
	})

	it('Should toggle off a comment if the selection is within the comment', async () => {
		editor.doc = markdownToTextDocument(`
This is line // with a comment`)
		editor.select(20)
		await wait(waitTime)
		editor.modules.tangent.toggleLineComment()

		// Note the removal of extra whitespace
		expect(editor.getText()).toEqual(`
This is line with a comment`)
		expect(editor.doc.selection).toEqual([17, 17])
	})

	it('Should toggle on multiple lines if multiple lines are selected', async () => {
		editor.doc = markdownToTextDocument(`
This is line 1
This is line 2`)
		editor.select([7, 24])
		await wait(waitTime)
		editor.modules.tangent.toggleLineComment()

		expect(editor.getText()).toEqual(`
//This is line 1
//This is line 2`)
		expect(editor.doc.selection).toEqual([9, 28])
	})

	it('Should toggle off multiple lines if multiple lines are selected', async () => {
		editor.doc = markdownToTextDocument(`
//This is line 1
//This is line 2`)
		editor.select([7, 24])
		await wait(waitTime)
		editor.modules.tangent.toggleLineComment()

		expect(editor.getText()).toEqual(`
This is line 1
This is line 2`)
		expect(editor.doc.selection).toEqual([5, 20])
	})

	it('Should toggle off multiple lines including blanks', async () => {
		editor.doc = markdownToTextDocument(`
//This is line 1
//
//This is line 3`)
		editor.select([7, 24])
		await wait(waitTime)
		editor.modules.tangent.toggleLineComment()

		expect(editor.getText()).toEqual(`
This is line 1

This is line 3`)
		expect(editor.doc.selection).toEqual([5, 18])
	})

	it('Should use the first line as the indicator of what to do when mixed lines are selected', async () => {
		editor.doc = markdownToTextDocument(`
This is line 1
//This is line 2`)
		editor.select([7, 24])
		await wait(waitTime)
		editor.modules.tangent.toggleLineComment()

		expect(editor.getText()).toEqual(`
//This is line 1
//This is line 2`)
		expect(editor.doc.selection).toEqual([9, 26])
	})

	it('Should use the first line as the indicator of what to do when mixed lines are selected', async () => {
		editor.doc = markdownToTextDocument(`
//This is line 1
This is line 2`)
		editor.select([7, 24])
		await wait(waitTime)
		editor.modules.tangent.toggleLineComment()

		expect(editor.getText()).toEqual(`
This is line 1
This is line 2`)
		expect(editor.doc.selection).toEqual([5, 22])
	})
})
