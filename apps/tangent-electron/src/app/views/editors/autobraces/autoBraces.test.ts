import { describe, test, expect } from 'vitest'

import { wait } from '@such-n-such/core'
import { Editor } from 'typewriter-editor'
import autoBraces, { type AutoBracesModulOptions } from './autoBracesModule'

function getEditor(options?: AutoBracesModulOptions) {

	options = {
		values: {
			'(': ')',
			'*': '*',
			'**': '**'
		},
		...(options ?? {})
	}

	const editor = new Editor({
		modules: {
			autoBraces: editor => autoBraces(editor, options)
		}
	})
	editor.setRoot(document.createElement('div'))
	editor.select(0)

	return editor
}

const waitTime = 20

// TODO: Refactor tests to match new keypress approach
describe.skip('Core Autobraces', () => {
	test('Inserts closing value', async () => {
		const editor = getEditor()
		editor.root.dispatchEvent(new KeyboardEvent('keydown', {
			key: '(',
			bubbles: true,
			cancelable: true
		}))
		//editor.insert('(')
		await wait(waitTime)
		expect(editor.getText()).toEqual('()')
		expect(editor.doc.selection).toEqual([1, 1])
	})

	test('Jumps closing value', async () => {
		const editor = getEditor()
		editor.setText('()')
		editor.select(1)
		await wait(waitTime)
		editor.root.dispatchEvent(new KeyboardEvent('keydown', {
			key: ')',
			bubbles: true,
			cancelable: true
		}))
		await wait(waitTime)
		expect(editor.getText()).toEqual('()')
		expect(editor.doc.selection).toEqual([2, 2])
	})

	test('Delete removes paired value', async () => {
		const editor = getEditor()
		editor.setText('()')
		editor.select(1)
		await wait(waitTime)
		editor.delete(-1)
		await wait(waitTime)
		expect(editor.getText()).toEqual('')
		expect(editor.doc.selection).toEqual([0, 0])
	})
})

// TODO: Refactor tests to match new keypress approach
describe.skip('Multi-character autobraces', () => {

	function getMultiEditor() {
		return getEditor({
			values: {
				'*': '*',
				'**': '**',
				'~~': '~~'
			}
		})
	}

	test('Allows multi-character inserts when defined', async () => {
		const editor = getMultiEditor()

		editor.insert('*')
		await wait(waitTime)
		expect(editor.getText()).toEqual('**')
		expect(editor.doc.selection).toEqual([1, 1])

		editor.insert('*')
		await wait(waitTime)
		expect(editor.getText()).toEqual('****')
		expect(editor.doc.selection).toEqual([2, 2])
	})

	test('Does not insert more characters when closing short', async () => {
		const editor = getMultiEditor()

		editor.insert('*')
		await wait(waitTime)
		expect(editor.getText()).toEqual('**')
		expect(editor.doc.selection).toEqual([1, 1])

		editor.insert('t')
		await wait(waitTime)

		editor.insert('*')
		await wait(waitTime)
		expect(editor.getText()).toEqual('*t*')
		expect(editor.doc.selection).toEqual([3, 3])
	})

	// TODO: Fix?
	test.skip('Does not insert more characters when closing long', async () => {
		const editor = getMultiEditor()

		editor.insert('*')
		await wait(waitTime)
		editor.insert('*')
		await wait(waitTime)
		expect(editor.getText()).toEqual('****')
		expect(editor.doc.selection).toEqual([1, 1])

		editor.insert('t')
		await wait(waitTime)

		editor.insert('*')
		await wait(waitTime)
		editor.insert('*')
		await wait(waitTime)
		expect(editor.getText()).toEqual('**t**')
		expect(editor.doc.selection).toEqual([5, 5])
	})

	// TODO: Fix?
	test.skip('Only inserts closing when there is a match', async () => {
		const editor = getMultiEditor()

		editor.insert('~')
		await wait(waitTime)
		expect(editor.getText()).toEqual('~')
		expect(editor.doc.selection).toEqual([1, 1])

		editor.insert('~')
		await wait(waitTime)
		expect(editor.getText()).toEqual('~~~~')
		expect(editor.doc.selection).toEqual([2, 2])
	})
})

describe('Selection wrapping braces', () => {
	// TODO: Fix?
	test.skip('Single & double character selection wrap', async () => {
		const editor = getEditor()

		editor.setText('Test')
		editor.select([0, 4])
		await wait(waitTime)

		editor.insert('*')
		await wait(waitTime)
		expect(editor.getText()).toEqual('*Test*')
		expect(editor.doc.selection).toEqual([1, 5])

		editor.insert('*')
		await wait(waitTime)
		expect(editor.getText()).toEqual('**Test**')
		expect(editor.doc.selection).toEqual([2, 6])
	})
})
