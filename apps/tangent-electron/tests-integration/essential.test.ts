import { Workspace } from 'app/model'
import { test, expect, wait } from './tangent'

import fs from 'fs'
import path from 'path'

test('New Note', async ({ tangent, workspace }) => {
	const window = await tangent.firstWindow()
	const { keyboard } = window

	await window.shortcut('Mod+N')

	await keyboard.type('My First Note')
	await keyboard.press('Enter')

	await keyboard.type('This is the content of my first note.')

	await window.shortcut('Mod+W')

	const notePath = path.join(workspace, 'My First Note.md')
	const noteContent = await fs.promises.readFile(notePath, 'utf8')
	
	// The file needs to have been saved
	expect(noteContent).toEqual('This is the content of my first note.')

	const relativepath = 'FILES/My First Note.md'

	// The file should be recorded in the session
	expect(await window.getCurrentRawSession()).toMatchObject({
		threadHistory: [
			{
				thread: [ relativepath ],
				currentNode: relativepath
			},
			{} // Will be an extra, nullish item. Don't care.
		],
		map: {
			nodes: {
				[relativepath]: {
					node: relativepath,
					strength: 2
				}
			}
		}
	})
})

test('New Daily Note', async ({ tangent, workspace }) => {
	const window = await tangent.firstWindow()
	const { keyboard } = window

	await window.shortcut('Mod+P')	// Open command palette
	await keyboard.type('Daily')	// Search for Daily Note
	await keyboard.press('Enter')	// Select daily note
	await keyboard.press('Enter')	// Exit note title

	const path = await window.getCurrentFilePath()
	expect(path).toBeTruthy()

	const errorDialog = window.page.locator('main article.error')
	// We should not error out creating the file
	expect(errorDialog).toHaveCount(0)

	const info = await fs.promises.stat(path)
	expect(info.isFile()).toBeTruthy()

	await keyboard.type('My daily note.')
	
	const currentNoteBody = window.locateCurrentNoteBody()
	expect(await currentNoteBody.innerText()).toBe('My daily note.')

	await window.shortcut('Mod+S')

	const noteContent = await fs.promises.readFile(path, 'utf8')
	expect(noteContent).toEqual('My daily note.')
})

test('Note Linking', async ({ tangent, workspace }) => {
	const window = await tangent.firstWindow(false)
	const { keyboard } = window

	const linkNotePath = path.join(workspace, 'Link Note.md')
	await fs.promises.writeFile(linkNotePath, 'Some content to link to.', 'utf8')

	await window.waitForReady()

	// Create a new note
	await window.shortcut('Mod+N')
	await keyboard.type('Linking Note')
	await keyboard.press('Enter')

	// Link to another note
	await keyboard.type('Linking to [')
	await keyboard.press('[')
	await keyboard.press('Enter')

	const currentNoteTitle = window.locateCurrentNoteTitle()

	expect(await window.getCurrentEditorText()).toEqual('Linking to [[Link Note]]')

	// Jump to that note
	await window.shortcut('Mod+Enter')

	expect(await currentNoteTitle.innerText()).toEqual('Link Note')
	// Confirm the linked note has focus
	expect(await window.getCurrentEditorText()).toEqual('Some content to link to.')

	// Navigate back
	await window.shortcut('Mod+Alt+ArrowLeft')
	expect(await currentNoteTitle.innerText()).toEqual('Linking Note')

	// Create a new link
	await window.page.waitForTimeout(100)
	await keyboard.press('Enter')
	await keyboard.press('Enter')

	await keyboard.type('Linking to [[New Note')
	await keyboard.press('Enter')

	expect(await window.getCurrentEditorText()).toEqual(`Linking to [[Link Note]]

Linking to [[New Note]]`)

	// Follow
	await window.shortcut('Mod+Enter')
	expect(await currentNoteTitle.innerText()).toEqual('New Note')

	// The map should be correct
	expect(await window.getCurrentRawSession()).toMatchObject({
		map: {
			nodes: {
				'FILES/Linking Note.md': {},
				'FILES/Link Note.md': {},
				'FILES/New Note.md': {}
			},
			connections: [
				{
					from: 'FILES/Linking Note.md',
					to: 'FILES/Link Note.md',
					strength: 3
				},
				{
					from: 'FILES/Linking Note.md',
					to: 'FILES/New Note.md',
					strength: 3
				}
			]
		}
	})
}) 

test('Opening & Moving Note', async ({ tangent, workspace }) => {
	const window = await tangent.firstWindow(false)
	const { keyboard } = window

	const linkNotePath = path.join(workspace, 'Note.md')
	await fs.promises.writeFile(linkNotePath, 'Some content.', 'utf8')
	await fs.promises.mkdir(path.join(workspace, 'A Folder'))

	await window.waitForReady()

	await window.shortcut('Mod+O')

	await keyboard.type('Note')		// Search for note
	await keyboard.press('Enter')	// Open it

	await wait(250) // TODO: Without this delay, the text editor can steal focus from the modal.

	const currentNoteTitle = window.locateCurrentNoteTitle()
	expect(currentNoteTitle).toHaveText('Note')

	expect(await window.getCurrentEditorText()).toEqual('Some content.')

	await window.shortcut('Mod+P')	// Open command palette
	await keyboard.type('Move')		// Search for Move Command
	await keyboard.press('Enter')	// Accept command
	await keyboard.type('Folder')	// Search for "A Folder"
	await keyboard.press('Enter')	// Accept move

	await wait(500)

	// The note moved successfully
	const movedContent = await fs.promises.readFile(path.join(workspace, 'A Folder', 'Note.md'), 'utf8')
	expect(movedContent).toEqual('Some content.')

	// And should no longer be in the old path
	try {
		await fs.promises.stat(linkNotePath)
		throw 'Should not get here: file should be moved'
	}
	catch (e) {
		// We expect this
	}
})

test('Creating and Deleting Note', async ({ tangent, workspace }) => {
	const window = await tangent.firstWindow()
	const { keyboard } = window

	await window.shortcut('Mod+N')
	await keyboard.type('My New Note')
	await keyboard.press('Enter')
	await keyboard.type('I will now delete this.')
	await window.shortcut('Mod+S')

	const filepath = path.join(workspace, "My New Note.md")

	const stats = await fs.promises.stat(filepath)
	expect(stats.isFile()).toBeTruthy()

	await wait(500)

	await window.shortcut('Mod+P')
	await keyboard.type('Delete')
	await keyboard.press('Enter')

	await wait(500)

	try {
		await fs.promises.stat(filepath)
		throw 'Should not get here: file should be gone.'
	}
	catch (e) {
		// Expect this
	}

	const virtual = await window.page.evaluate(filepath => {
		const workspace = (document as any).workspace as Workspace
		const file = workspace.directoryStore.get(filepath)

		return file?.meta?.virtual
	}, filepath)

	expect(virtual).toBe(undefined)
})
