import fs from 'fs'
import path from 'path'

import { test, expect, wait } from './tangent'
import type Workspace from 'app/model/Workspace'

test('Creating and Modifying Nested Wiki Links', async ({ tangent, workspace}) => {
	const window = await tangent.firstWindow()
	const { keyboard } = window

	// Create the origin note
	await window.shortcut('Mod+N')
	await keyboard.type('Some Note')
	await keyboard.press('Enter')

	await keyboard.type('A link to [[Some Neat/Test]]')

	await window.shortcut('Mod+S')

	const someNodePath = 'FILES/Some Note.md'
	const firstLinkPath = 'FILES/Some Neat/Test.md'

	// The wiki link should show up in the session
	expect(await window.getCurrentRawSession()).toMatchObject({
		map: {
			nodes: {
				[someNodePath]: {
					node: someNodePath
				},
				[firstLinkPath]: {
					node: firstLinkPath
				}
			},
			connections: [
				{
					from: someNodePath,
					to: firstLinkPath,
					strength: 1
				}
			]
		}
	})

	await keyboard.press('ArrowLeft')
	await keyboard.press('ArrowLeft')

	await keyboard.type('/Another')

	await window.shortcut('Mod+Enter')

	const secondLinkPath = 'FILES/Some Neat/Test/Another.md'

	const expectedSession = {
		map: {
			nodes: {
				[someNodePath]: {
					node: someNodePath
				},
				[secondLinkPath]: {
					node: secondLinkPath
				}
			},
			connections: [
				{
					from: someNodePath,
					to: secondLinkPath,
					strength: 3
				}
			]
		}
	}

	expect(await window.getCurrentRawSession()).toMatchObject(expectedSession)
	expect(await window.getCurrentRawClientSession()).toMatchObject(expectedSession)
})

test('Creating & Fulfilling Sibling Wiki Links', async ({ tangent, workspace }) => {
	const window = await tangent.firstWindow(false)
	const { keyboard } = window

	await fs.promises.mkdir(path.join(workspace, 'Folder'))

	await window.waitForReady()

	function makeNodeInFolder(folder: string, note: string) {
		return window.page.evaluate(({ folder, note }) => {
			const workspace = (document as any).workspace as Workspace
			const folderNode = workspace.directoryStore.getWithPortablePath('FILES/' + folder)
			workspace.commands.createNewFile.execute({
				folder: folderNode,
				name: note
			})
		}, { folder, note })
	}

	// Create a source note
	await makeNodeInFolder('Folder', 'A Note That Links')

	await keyboard.press('Enter') // Accept name
	// TODO: Without the delay, the virtual map connection is not made.
	await keyboard.type('A note linking to [[The Note It Links To]].', { delay: 7 })

	await wait(100)
	await window.shortcut('Mod+S')

	const linkNotePath = 'FILES/Folder/A Note That Links.md'
	const virtualTargetPath = 'FILES/The Note It Links To.md'

	const expectedPreCreationSession = {
		map: {
			nodes: {
				[linkNotePath]: {
					node: linkNotePath
				},
				[virtualTargetPath]: {
					node: virtualTargetPath
				}
			},
			connections: [
				{
					from: linkNotePath,
					to: virtualTargetPath
				}
			]
		}
	}

	await wait(600) // This delay is also required for the virtual note to propegate

	expect(await window.getCurrentRawClientSession()).toMatchObject(expectedPreCreationSession)
	expect(await window.getCurrentRawSession()).toMatchObject(expectedPreCreationSession)

	await makeNodeInFolder('Folder', 'New Note')
	await wait(200)
	// Rename Note
	await keyboard.type('The Note It Links To')
	await keyboard.press('Enter')

	await wait(200)

	await keyboard.type('The content of the linked note.')

	await window.shortcut('Mod+S')

	await wait(200)

	const targetNotePath = 'FILES/Folder/The Note It Links To.md'

	const expectedPostCreationSession = {
		map: {
			nodes: {
				[linkNotePath]: {
					node: linkNotePath
				},
				[targetNotePath]: {
					node: targetNotePath
				}
			},
			connections: [
				{
					from: linkNotePath,
					to: targetNotePath
				}
			]
		}
	}

	const clientSession = await window.getCurrentRawClientSession()
	expect(clientSession).toMatchObject(expectedPostCreationSession)
	expect(clientSession.map.nodes[virtualTargetPath]).toBeUndefined()

	const fileSession = await window.getCurrentRawSession()
	expect(fileSession).toMatchObject(expectedPostCreationSession)
	expect(fileSession.map.nodes[virtualTargetPath]).toBeUndefined()
})

test('Working with and then deleting files in folder', async ({ tangent, workspace }) => {
	const window = await tangent.firstWindow(false)
	const { keyboard } = window

	const folderPath = path.join(workspace, 'My Folder')
	const file1Path = path.join(folderPath, 'File1.md')
	const file2Path = path.join(folderPath, 'File2.md')

	await fs.promises.mkdir(folderPath)
	await fs.promises.writeFile(file1Path, 'Hello there!', 'utf8')
	await fs.promises.writeFile(file2Path, 'Hello again!', 'utf8')

	await window.waitForReady()

	await wait(1000)

	// Open folder
	await window.shortcut('Mod+O')
	await keyboard.type('My Folder')
	await keyboard.press('Enter')
	await wait(500)

	// Open first file
	await window.shortcut('Mod+O')
	await keyboard.type('File1')
	await window.shortcut('Mod+Enter')

	await wait(500)

	// Open second file
	await window.shortcut('Mod+O')
	await keyboard.type('File2')
	await window.shortcut('Mod+Enter')

	const folderPortablePath = 'FILES/My Folder'
	const file1PortablePath = 'FILES/My Folder/File1.md'
	const file2PortablePath = 'FILES/My Folder/File2.md'


	const expectedPreDeletionSession = {
		map: {
			nodes: {
				[file1PortablePath]: {
					node: file1PortablePath
				},
				[file2PortablePath]: {
					node: file2PortablePath
				}
			},
			connections: [
				{
					from: folderPortablePath,
					to: file1PortablePath
				},
				{
					from: file1PortablePath,
					to: file2PortablePath
				}
			]
		}
	}

	await wait(500) // This delay is also required for the virtual note to propegate

	expect(await window.getCurrentRawClientSession()).toMatchObject(expectedPreDeletionSession)
	expect(await window.getCurrentRawSession()).toMatchObject(expectedPreDeletionSession)


	// Delete folder
	await window.shortcut('Mod+Alt+ArrowLeft')
	await wait(500)
	await window.shortcut('Mod+Alt+ArrowLeft')
	await wait(500)
	await window.shortcut('Mod+P')
	await keyboard.type('Delete')
	await wait(500)
	await keyboard.press('Enter')

	await wait(1500)

	const expectedPostDeletionSession = {
		map: {
			nodes: {
			},
			connections: [
			]
		}
	}

	expect(window.page.locator('main article.error')).toHaveCount(0)

	const clientSession = await window.getCurrentRawClientSession()
	expect(clientSession).toMatchObject(expectedPostDeletionSession)
	expect(clientSession.map.nodes).toEqual({})
	
	const rawSession = await window.getCurrentRawSession()
	expect(rawSession).toMatchObject(expectedPostDeletionSession)
	expect(rawSession.map.nodes).toEqual({})

})
