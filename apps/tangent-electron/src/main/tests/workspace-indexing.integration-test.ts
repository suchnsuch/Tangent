import { describe, test, expect, beforeAll, afterAll, afterEach } from 'vitest'

import path from 'path'
import fs from 'fs'
import { wait } from '@such-n-such/core'
import Workspace from '../Workspace'
import type { TreeNode } from 'common/trees'
import { EmbedInfo, IndexData, LinkInfo, StructureType, TagInfo } from 'common/indexing/indexTypes'
import type File from '../File'
import type { FileWatcher } from '../File'

describe('Indexing', () => {
	let workspace: Workspace = null
	let newPaths: string[] = []

	beforeAll(() => {
		const workspacePath = path.resolve(path.join(__dirname, '../../../../../test-files/TestWorkspace'))
		return Workspace.loadWorkspace(workspacePath).then(w => {
			workspace = w
		})
	})

	afterEach(async () => {
		await workspace.watcherIdleHandle()

		await fileOp(Promise.allSettled(newPaths.map(p => {
			return fs.promises.rm(p, {
				force: true,
				recursive: true
			})
		})))

		newPaths = []
	})

	afterAll(async () => {
		await workspace.watcherIdleHandle()
		workspace.close()
		newPaths.forEach(async p => {
			try {
				await fs.promises.rm(p, {
					force: true,
					recursive: true
				})
			} catch (err) {
				console.log(err)
			}
		})
	})

	function getAndCheckFile(href: string) {
		let note = workspace.contentsStore.getMatchesForPath(href, {
			bestOnly: true
		})

		if (Array.isArray(note)) {
			console.log(note)
			throw `${href} should resolve to a virtual file`
		}

		expect(note).not.toBeNull()
		expect(note.meta).not.toBeNull()
		return note
	}

	function expectNoFile(href: string) {
		let result = workspace.contentsStore.getMatchesForPath(href, {
			bestOnly: true
		})

		expect(result).toHaveLength(0)
	}

	async function fileOp(filePromise: Promise<unknown>) {
		await filePromise
		// This number is a total hack. If shit breaks and you don't know why,
		// try making this number go up. Naturally, you want it to be as low
		// as possible, otherwise the tests will take longer.
		await wait(160)
		await workspace.watcherIdleHandle()
	}

	function getRootPath(filepath: string) {
		return path.join(workspace.contentsStore.files.path, filepath)
	}

	async function createNote(name: string) {
		let notePath = getRootPath(`${name}.md`)
		newPaths.push(notePath)
		let newNote = await workspace.createFile(null, notePath, null)
		return newNote
	}

	test('Index Initialization', async () => {
		expect(workspace).not.toBeNull()
	})

	test('Images should know what is linking to them', () => {
		let testImage = workspace.contentsStore.getMatchesForPath('Test Image.jpg', {
			bestOnly: true
		})
		expect(testImage).not.toBeFalsy()
		expect(Array.isArray(testImage)).toBeFalsy()
		if (!Array.isArray(testImage)) {
			expect(testImage.meta.inLinks.length).toBeGreaterThan(0)
		}
	})

	test('Links to nowhere create virtual files', async () => {
		let newNote = getAndCheckFile('New Test Note')
		expect(newNote.meta.virtual).toEqual(true)

		let testFile2 = getAndCheckFile('Test File The Second')

		// There should be a virtual file for "New Test Note"
		expect(newNote.meta.inLinks).toContainEqual<LinkInfo>({
			type: StructureType.Link,
			href: 'New Test Note',
			from: testFile2.path,
			form: 'wiki',
			start: 443,
			end: 460,
			context: "[[New Test Note]] (Don't edit above this line or tests will break)"
		})

		expect([...IndexData.outgoingConnections(testFile2.meta)]).toContainEqual<LinkInfo>({
			type: StructureType.Link,
			href: 'New Test Note',
			form: 'wiki',
			to: newNote.path,
			start: 443,
			end: 460,
			context: "[[New Test Note]] (Don't edit above this line or tests will break)"
		})
	})

	test('Creating and removing a once-virtual file should retain the links', async () => {
		let newNote = getAndCheckFile('New Test Note')
		expect(newNote.meta.virtual).toEqual(true)

		let testFile2 = getAndCheckFile('Test File The Second')

		newPaths.push(newNote.path)
		await fileOp(fs.promises.writeFile(newNote.path, 'Oh hello there!', 'utf8'))

		expect(newNote.meta.virtual).toBe(false)

		await fileOp(fs.promises.unlink(newNote.path))
		expect(newNote.meta.virtual).toBe(true)

		// Links should still be there
		expect(newNote.meta.inLinks).toContainEqual<LinkInfo>({
			type: StructureType.Link,
			href: 'New Test Note',
			form: 'wiki',
			from: testFile2.path,
			start: 443,
			end: 460,
			context: "[[New Test Note]] (Don't edit above this line or tests will break)"
		})

		expect([...IndexData.outgoingConnections(testFile2.meta)]).toContainEqual<LinkInfo>({
			type: StructureType.Link,
			href: 'New Test Note',
			form: 'wiki',
			to: newNote.path,
			start: 443,
			end: 460,
			context: "[[New Test Note]] (Don't edit above this line or tests will break)"
		})
	})

	test('Links to headers should not create a virtual file', async () => {
		expect(workspace.contentsStore.getMatchesForPath("Header Link Source#Header 1", {
			bestOnly: true
		})).toEqual([])
	})

	describe('Virtual Folders', () => {
		test('Links to nowhere should create virtual folders if necessary', async () => {
			// There should be a virtual file and folder for a [[Other/Link]] link
			const otherFolder = workspace.contentsStore.get(getRootPath('Other'))
			expect(otherFolder).not.toBeFalsy()
			expect(otherFolder.meta).toMatchObject({ virtual: true })
	
			const otherLinkFile = workspace.contentsStore.get(getRootPath('Other/Link.md'))
			expect(otherLinkFile).not.toBeFalsy()
			expect(otherLinkFile.meta).toMatchObject({ virtual: true })
		})
	
		test('Virtual folders should be made non-virtual when a real folder is created externally', async () => {
			const otherPath = getRootPath('Other')
			const otherFolder = workspace.contentsStore.get(otherPath)
			expect(otherFolder).not.toBeFalsy()
			expect(otherFolder.meta).toMatchObject({ virtual: true })
	
			newPaths.push(otherPath)
			await fileOp(fs.promises.mkdir(otherPath))
	
			const nonVirtualFolder = workspace.contentsStore.get(otherPath)
			expect(nonVirtualFolder).not.toBeFalsy()
			expect(nonVirtualFolder.meta?.virtual).not.toBeTruthy()
		})

		test('Virtual folders should be made non-virtual when a sub-element is created non-virtually', async () => {
			const otherPath = getRootPath('Other')
			const otherLinkPath = getRootPath('Other/Link.md')
			newPaths.push(otherLinkPath, otherPath)
			
			const otherFolder = workspace.contentsStore.get(otherPath)
			expect(otherFolder).not.toBeFalsy()
			expect(otherFolder.meta).toMatchObject({ virtual: true })
			
			await workspace.createFile(null, otherLinkPath)
	
			const nonVirtualFolder = workspace.contentsStore.get(otherPath)
			expect(nonVirtualFolder).not.toBeFalsy()
			expect(nonVirtualFolder.meta?.virtual).not.toBeTruthy()

			await workspace.watcherIdleHandle()

			let stats = null
			const getStats = fs.promises.stat(nonVirtualFolder.path).then(s => stats = s)
			await expect(getStats).resolves.not.toThrowError()
			expect(stats.isDirectory).toBeTruthy()
		})

		test('Virtual links should be moved when a similar virtual link includes folder information', async () => {
			// This is based off of `Integration Tests/Virtual Link Shenanigans.md`
			const file = getAndCheckFile('Some Virtual File')
			const relativePath = workspace.contentsStore.pathToRelativePath(file.path)
			expect(relativePath).toEqual(path.join('Some Virtual Folder', 'Some Virtual File.md'))

			const shenanigans = getAndCheckFile('Virtual Link Shenanigans')
			// Renaming virtual files should _not_ change the text of any source files.
			expect(shenanigans.meta.structure[1]).toMatchObject<Partial<LinkInfo>>({
				href: 'Some Virtual Folder/Some Virtual File'
			})
		})

		test('Virtual links that collide with virtual folders should not rename folders as files', async () => {
			const results = workspace.contentsStore.getMatchesForPath('Some Virtual Folder', {
				bestOnly: true
			})
			expect(results[0].fileType).toEqual('folder')
		})
	})

	test('Links with periods should resolve correctly', async () => {
		const store = workspace.contentsStore
		let linkToPeriodNodes = store.getMatchesForPath('Link to notes with periods', { bestOnly: true}) as TreeNode
		let dir = path.dirname(linkToPeriodNodes.path)

		let firstLink = linkToPeriodNodes.meta.structure[0] as LinkInfo
		expect(firstLink.type).toEqual(StructureType.Link)
		let firstPath = path.join(dir, 'Note.with.periods.md')
		expect(firstLink.to).toEqual(firstPath)
		let firstNote = store.get(firstPath)
		expect(firstNote).not.toBeNull();
		expect(firstNote?.meta?.virtual).toBeFalsy()

		let secondLink = linkToPeriodNodes.meta.structure[1] as LinkInfo
		let secondPath = path.join(store.files.path, 'another.note.with.periods.md')
		expect(secondLink.to).toEqual(secondPath)
		expect(store.get(secondPath)?.meta?.virtual).toEqual(true)
	})

	test('Links with colons should link to a note without colons', async () => {
		expectNoFile('Note With: Colons')
		let badLinkSource = getAndCheckFile('Note With Links With Bad Characters')
		let link = badLinkSource.meta.structure[0] as LinkInfo
		let target = workspace.contentsStore.get(link.to)
		expect(target.name).toEqual('Note With Colons')
	})

	test('Link creation & updating', async () => {
		let autoTest = await createNote('Auto Test')
		
		await workspace.updateFileContents(autoTest.path, `
Hello there, I am a note and I link to [[Another Auto Test]]`)

		let anotherAutoTest = getAndCheckFile('Another Auto Test')
		expect(anotherAutoTest.meta.virtual).toBe(true)

		expect([...IndexData.outgoingConnections(autoTest.meta)]).toEqual<LinkInfo[]>([{
			type: StructureType.Link,
			href: 'Another Auto Test',
			form: 'wiki',
			to: anotherAutoTest.path,
			start: 40,
			end: 61,
			context: "Hello there, I am a note and I link to [[Another Auto Test]]"
		}])

		expect(anotherAutoTest.meta.inLinks).toEqual<LinkInfo[]>([{
			type: StructureType.Link,
			href: 'Another Auto Test',
			from: autoTest.path,
			form: 'wiki',
			start: 40,
			end: 61,
			context: "Hello there, I am a note and I link to [[Another Auto Test]]"
		}])

		// Update the note to remove the reference
		await workspace.updateFileContents(autoTest.path, `
Hello. I no longer link to that note.`)

		expect([...IndexData.outgoingConnections(autoTest.meta)]).toEqual([])
		expectNoFile('Another Auto Test')

		// Externally update the note with a new reference
		await fileOp(fs.promises.writeFile(autoTest.path, `
Once again, I link to [[Another Auto Test|that test, but with custom text]].`))

		anotherAutoTest = getAndCheckFile('Another Auto Test')
		expect(anotherAutoTest.meta.virtual).toBe(true)

		expect([...IndexData.outgoingConnections(autoTest.meta)]).toEqual<LinkInfo[]>([{
			type: StructureType.Link,
			href: 'Another Auto Test',
			text: 'that test, but with custom text',
			form: 'wiki',
			to: anotherAutoTest.path,
			start: 23,
			end: 76,
			context: 'Once again, I link to [[Another Auto Test|that test, but with custom text]].'
		}])

		expect(anotherAutoTest.meta.inLinks).toEqual<LinkInfo[]>([{
			type: StructureType.Link,
			href: 'Another Auto Test',
			text: 'that test, but with custom text',
			form: 'wiki',
			from: autoTest.path,
			start: 23,
			end: 76,
			context: 'Once again, I link to [[Another Auto Test|that test, but with custom text]].'
		}])
	})

	test('Renaming With Links', async () => {
		let renameTarget = await createNote('Rename Target')
		await workspace.updateFileContents(renameTarget.path, 'Gonna rename this one.')

		let renameWatcher = await createNote('Rename Watcher')
		await workspace.updateFileContents(
			renameWatcher.path, `I am linked to [[Rename Target]]`)

		let obfuscatedWatcher = await createNote('Obfuscated Watcher')
		await workspace.updateFileContents(
			obfuscatedWatcher.path, `I am linked to [[Rename Target|a place]] [[Rename Target|twice]]`)

		let newPath = getRootPath('Renamed Target.md')
		newPaths.push(newPath)
		await workspace.move(renameTarget.path, newPath)

		let watcherText = await workspace.getFileContents(renameWatcher.path)
		expect(watcherText).toEqual('I am linked to [[Renamed Target]]')

		let obfuscatedText = await workspace.getFileContents(obfuscatedWatcher.path)
		expect(obfuscatedText).toEqual('I am linked to [[Renamed Target|a place]] [[Renamed Target|twice]]')
	})

	test('Renaming With Two Way Links', async () => {
		let renameTarget = await createNote('Rename Link Target')
		await workspace.updateFileContents(renameTarget.path, 'I am linked to [[Rename Link Watcher]]')

		let renameWatcher = await createNote('Rename Link Watcher')
		await workspace.updateFileContents(
			renameWatcher.path, `I am linked to [[Rename Link Target]]`)

		let newPath = getRootPath('Renamed Link Target.md')
		newPaths.push(newPath)
		await workspace.move(renameTarget.path, newPath)

		// Wait for dirty cache to resolve.
		// The right way of doing this isn't working...
		await wait(600)

		let watcherText = await workspace.getFileContents(renameWatcher.path)
		expect(watcherText).toEqual('I am linked to [[Renamed Link Target]]')
		
		expect(renameWatcher.meta.inLinks).toMatchObject([
			{
				from: renameTarget.path
			}
		])
	})

	test('Re-casing Title with no links', async () => {
		let renameTarget = await createNote('Recase Target')
		await workspace.updateFileContents(renameTarget.path, 'Gonna rename this one.')
		await workspace.watcherIdleHandle()

		const oldPath = renameTarget.path
		const newPath = getRootPath('recase target.md')
		newPaths.push(newPath)
		await workspace.move(renameTarget.path, newPath)

		// Wait for dirty cache to resolve.
		// The right way of doing this isn't working...
		await wait(600)

		const newPathFile = workspace.contentsStore.get(newPath)
		expect(newPathFile).toBe(renameTarget)

		const oldPathFile = workspace.contentsStore.get(oldPath)
		expect(oldPathFile).toBeFalsy()

		const lowerMatchResult = workspace.contentsStore.getMatchesForPath('recase target', { bestOnly: true })
		expect(lowerMatchResult).toBe(renameTarget);
	})

	test('Re-casing Title With Links', async () => {
		let renameTarget = await createNote('Recase Link Target')
		await workspace.updateFileContents(renameTarget.path, 'Gonna rename this one.')
		await workspace.updateFileContents(
			renameTarget.path, `I am linked to [[Recase Link Watcher]]`)

		let renameWatcher = await createNote('Recase Link Watcher')
		await workspace.updateFileContents(
			renameWatcher.path, `I am linked to [[Recase Link Target]]`)

		let newPath = getRootPath('recase link target.md')
		newPaths.push(newPath)
		await workspace.move(renameTarget.path, newPath)

		// Wait for dirty cache to resolve.
		// The right way of doing this isn't working...
		await wait(600)

		let watcherText = await workspace.getFileContents(renameWatcher.path)
		expect(watcherText).toEqual('I am linked to [[recase link target]]')

		expect(renameWatcher.meta.inLinks).toMatchObject([
			{
				from: renameTarget.path
			}
		])
	})

	test('Creating new note that breaks links', async () => {
		let folderPath = getRootPath('Auto Folder')
		newPaths.push(folderPath)
		await fileOp(fs.promises.mkdir(folderPath))

		let folderNote = await createNote('Auto Folder/Watch Target Note')
		
		let referencer = await createNote('Folder Note Watcher')
		await workspace.updateFileContents(
			referencer.path, `I am watching [[Watch Target Note]]`)
		
		let overrideNote = await createNote('Watch Target Note')

		await workspace.watcherIdleHandle()

		let referencerText = await workspace.getFileContents(referencer.path)
		expect(referencerText).toEqual('I am watching [[Auto Folder/Watch Target Note]]')
	})

	test('Creating new note in a different place than a virtual note by the same name', async () => {
		let folderPath = getRootPath('Auto Folder')
		newPaths.push(folderPath)
		await fileOp(fs.promises.mkdir(folderPath))

		let referencer = await createNote('Note Watcher')
		await workspace.updateFileContents(
			referencer.path, `I am watching [[A Virtual Note]]`)
			
		let virtualNote = await createNote('Auto Folder/A Virtual Note')
		
		await workspace.watcherIdleHandle()

		let referencerText = await workspace.getFileContents(referencer.path)
		expect(referencerText).toEqual('I am watching [[A Virtual Note]]')

		let hrefResult = workspace.contentsStore.getMatchesForPath('A Virtual Note', {
			bestOnly: true
		})

		expect(Array.isArray(hrefResult)).toEqual(false)
		expect(hrefResult).toBe(virtualNote)

		expect([...IndexData.outgoingConnections(referencer.meta)][0].to).toEqual(virtualNote.path)
	})

	test('Moving a note that breaks links', async () => {
		let folderPath1 = getRootPath('Folder 1')
		newPaths.push(folderPath1)
		await fileOp(fs.promises.mkdir(folderPath1))

		let folderPath2 = getRootPath('Folder 2')
		newPaths.push(folderPath2)
		await fileOp(fs.promises.mkdir(folderPath2))

		let folder1Note = await createNote('Folder 1/Folder Note')
		let movingNote = await createNote('Moving Note')

		let folder1Watcher = await createNote('Folder 1 Watcher')
		await workspace.updateFileContents(
			folder1Watcher.path, `I am watching [[Folder Note]]`)

		let movingWatcher = await createNote('Moving Watcher')
		await workspace.updateFileContents(
			movingWatcher.path, 'I am watching [[Moving Note]]')

		expect(folder1Note.meta).not.toBeNull()

		expect(movingNote.meta).not.toBeNull()
		expect(movingNote.meta.inLinks).toEqual<LinkInfo[]>([{
			type: StructureType.Link,
			href: 'Moving Note',
			from: movingWatcher.path,
			form: 'wiki',
			start: 14,
			end: 29,
			context: 'I am watching [[Moving Note]]'
		}])

		let movePath = path.join(
			workspace.contentsStore.files.path,
			'Folder 2',
			'Folder Note.md')
		newPaths.push(movePath)

		await workspace.move(movingNote.path, movePath)
		
		let folder1WatcherText = await workspace.getFileContents(folder1Watcher.path)
		expect(folder1WatcherText).toEqual('I am watching [[Folder 1/Folder Note]]')

		let movingWatcherText = await workspace.getFileContents(movingWatcher.path)
		expect(movingWatcherText).toEqual('I am watching [[Folder 2/Folder Note]]')
		expect([...IndexData.outgoingConnections(movingWatcher.meta)][0].to).toEqual(movePath)
	})

	test('Renaming a node into a virtual link', async () => {
		let linkingNode = await createNote('Linking Note')
		await workspace.updateFileContents(
			linkingNode.path, 'I link to [[Rename Target]]')
		
		let renameNode = await createNote('Note to Rename')

		let hrefResult = workspace.contentsStore.getMatchesForPath('Rename Target', {
			bestOnly: true
		})

		expect(Array.isArray(hrefResult)).toBe(false)
		let virtualNode = hrefResult as TreeNode
		expect(virtualNode.meta.virtual).toBe(true)

		let movePath = path.join(workspace.contentsStore.files.path, 'Rename Target.md')
		newPaths.push(movePath)
		await workspace.move(renameNode.path, movePath)

		await workspace.watcherIdleHandle()

		expect([...IndexData.outgoingConnections(linkingNode.meta)]).toMatchObject([
			{
				to: renameNode.path,
				href: 'Rename Target'
			}
		])
		expect(workspace.contentsStore.get(virtualNode.path)).toBe(renameNode)
	})

	test('Renaming a node in a folder into a virtual link', async () => {
		let folderLinkingNode = await createNote('Folder Linking Note')
		await workspace.updateFileContents(
			folderLinkingNode.path, 'I link to [[Folder Rename Target]]')
		
		let folderPath = getRootPath('Rename Target Folder')
		newPaths.push(folderPath)
		await fileOp(fs.promises.mkdir(folderPath))

		let renameNode = await createNote('Rename Target Folder/Note to Rename')

		let hrefResult = workspace.contentsStore.getMatchesForPath('Folder Rename Target', {
			bestOnly: true
		})

		expect(Array.isArray(hrefResult)).toBe(false)
		let virtualNode = hrefResult as TreeNode
		expect(virtualNode.meta.virtual).toBe(true)

		let movePath = path.join(workspace.contentsStore.files.path, 'Rename Target Folder/Folder Rename Target.md')
		newPaths.push(movePath)
		await workspace.move(renameNode.path, movePath)

		await workspace.watcherIdleHandle()

		expect([...IndexData.outgoingConnections(folderLinkingNode.meta)]).toMatchObject([
			{
				to: renameNode.path,
				href: 'Folder Rename Target'
			}
		])
		expect(workspace.contentsStore.has(virtualNode.path)).toBe(false)
	})

	test('Renaming a node with the same name as a folder-scoped virtual link', async () => {
		/**
		 * In this case, the folder-scoped virtual note should _not_ be stomped
		 * by the renamed node. The virtual nature of the link should be retained.
		 */
		let folderLinkingNode = await createNote('Folder Linking Note')
		await workspace.updateFileContents(
			folderLinkingNode.path, 'I link to [[Virtual Folder/Virtual Rename Target]]')
		
		let renameNode = await createNote('Note to Rename')

		let hrefResult = workspace.contentsStore.getMatchesForPath('Virtual Rename Target', {
			bestOnly: true
		})

		expect(Array.isArray(hrefResult)).toBe(false)
		let virtualNode = hrefResult as TreeNode
		expect(virtualNode.meta.virtual).toBe(true)

		let movePath = path.join(workspace.contentsStore.files.path, 'Virtual Rename Target.md')
		newPaths.push(movePath)
		await workspace.move(renameNode.path, movePath)

		await workspace.watcherIdleHandle()

		expect([...IndexData.outgoingConnections(folderLinkingNode.meta)]).toMatchObject([
			{
				to: virtualNode.path,
				href: 'Virtual Folder/Virtual Rename Target'
			}
		])
		expect(workspace.contentsStore.get(virtualNode.path)).toBe(virtualNode)
	})

	test('Creating links to missing non-markdown files', async() => {
		let linkTest = await createNote('File Link Test')
		
		await workspace.updateFileContents(linkTest.path, `
Hello there, I am a note and I link to [[Some Missing Image.png]]`)

		let imageLink = linkTest.meta.structure[0] as LinkInfo
		expect(path.basename(imageLink.to)).toEqual('Some Missing Image.png')

		let anotherAutoTest = getAndCheckFile('Some Missing Image.png')
		expect(anotherAutoTest.meta.virtual).toBe(true)
	})

	test('Notes with headers should be indexed', async () => {
		let headerSource = getAndCheckFile('Header Link Source')
		expect(headerSource.meta.structure).toEqual([
			{
				type: StructureType.Header,
				level: 1,
				text: 'Header 1',
				start: 48,
				end: 58,
			},
			{
				type: StructureType.Link,
				content_id: 'Sub-Header',
				context: 'This is the first header. Here is a link to bottom: [[#Sub-Header]]',
				href: '',
				form: 'wiki',
				start : 111,
				end: 126
			},
			{
				type: StructureType.Header,
				level: 1,
				text: 'Header 2',
				start: 145,
				end: 155
			},
			{
				type: StructureType.Header,
				level: 2,
				text: 'Sub-Header',
				start: 199,
				end: 212
			}
		])
	})

	describe('Notes with tags and virtual links with the same name should not conflic', () => {
		test('Virtual file first', async () => {
			// Virtual file first
			const notATagReference = getAndCheckFile('Link Tests/Referencing NotATag.md')
			const structure = notATagReference.meta.structure
	
			expect((structure[0] as LinkInfo).to.endsWith('NotATag.md')).toBeTruthy()
			expect((structure[1] as TagInfo).to).toEqual('#/NOTATAG')
		})

		test('Tag first', async () => {
			// Tag first
			const otherTagReference = getAndCheckFile('Link Tests/Referencing OtherTag.md')
			const structure = otherTagReference.meta.structure
	
			expect((structure[0] as TagInfo).to).toEqual('#/OTHERTAG')
			expect((structure[1] as LinkInfo).to.endsWith('OtherTag.md')).toBeTruthy()
		})
	})

	test('Renaming embedded images', async () => {
		const imagePath = getRootPath('Test Image.jpg')
		const testImagePath = getRootPath('Temp Test Image.jpg')
		const testImageMovedPath = getRootPath('Temp Moved Image.jpg')
		newPaths.push(testImagePath)
		newPaths.push(testImageMovedPath)
		
		await fs.promises.copyFile(imagePath, testImagePath)
		let info = await fs.promises.stat(testImagePath)
		expect(info.isFile).toBeTruthy()

		await wait(1000)
		await workspace.watcherIdleHandle()
		let imageFile = workspace.contentsStore.get(testImagePath)
		expect(imageFile).not.toBeFalsy()
		expect(imageFile.meta?.virtual).toBeFalsy()

		let imageTest = await createNote('Image Rename Test')
		await workspace.updateFileContents(imageTest.path, 'An image: ![[Temp Test Image.jpg]]')

		expect(imageFile.meta.inLinks).toEqual<EmbedInfo[]>([{
			type: StructureType.Embed,
			href: 'Temp Test Image.jpg',
			form: 'wiki',
			start: 10,
			end: 34,
			context: 'An image: ![[Temp Test Image.jpg]]',
			from: imageTest.path
		}])

		await workspace.move(testImagePath, testImageMovedPath)

		info = await fs.promises.stat(testImageMovedPath)
		expect(info.isFile).toBeTruthy()
		expect(imageTest.contents).toEqual('An image: ![[Temp Moved Image.jpg]]')
	})

	test('Responding to file changes', async () => {
		const rawFilePath = getRootPath('raw file.md')
		newPaths.push(rawFilePath)

		await fileOp(fs.promises.writeFile(rawFilePath, 'This is some fun text', 'utf8'))

		// Adding a new file should create a new node
		const rawFileNode = workspace.contentsStore.get(rawFilePath)
		expect(rawFileNode).not.toBeFalsy()

		// Set up observer to test automatic updates
		const fileNode = rawFileNode as File
		let content: string = null
		const observer: FileWatcher = {
			sendFileContents(path, contents) {
				expect(typeof contents).toEqual('string')
				content = contents as string
			},
			postUserMessage(type, ...args) {
				// nothing
			}
		}
		fileNode.addObserver(observer)

		// Updating the file should update observers
		await wait(500)

		expect(content).toEqual('This is some fun text')
		await fileOp(fs.promises.writeFile(rawFilePath, 'Something else was written here', 'utf8'))
		await wait(200)
		expect(content).toEqual('Something else was written here')

		// Removing the file with active observers should make it virtual
		await fileOp(fs.promises.rm(rawFilePath))
		expect(workspace.contentsStore.get(rawFilePath)?.meta?.virtual).toBeTruthy()

		// Removing the active observer should delete it
		workspace.dropFile(observer, fileNode.path)
		expect(workspace.contentsStore.get(rawFilePath)).toBeFalsy()
	})

	describe('Node Deletion', () => {
		test('Deleting a note with no incoming links should remove it', async () => {
			const note = await createNote('Unlinked Delete Target')

			await workspace.delete(note.path)

			expect(workspace.contentsStore.get(note.path)).toBeFalsy()

			try {
				await fs.promises.stat(note.path)
				throw 'Should not make it here: File should be gone'
			} catch (e) {
				// expect this
			}
		})

		test('Deleting a note with incoming links should not remove it', async () => {
			const linkingNote = await createNote('Virtual Delete Linking Note')
			const deleteTarget = await createNote('Virtual Delete Target')
			await workspace.updateFileContents(linkingNote.path, 'I link to [[Virtual Delete Target]]')
			await workspace.updateFileContents(deleteTarget.path, 'I have contents!')

			await workspace.delete(deleteTarget.path)

			expect(workspace.contentsStore.get(deleteTarget.path)).toBe(deleteTarget)
			expect(deleteTarget.meta.virtual).toBeTruthy()
		})

		test('Externally deleting a note with incoming links should not remove it', async () => {
			const linkingNote = await createNote('Virtual RM Linking Note')
			const deleteTarget = await createNote('Virtual RM Target')
			await workspace.updateFileContents(linkingNote.path, 'I link to [[Virtual RM Target]]')
			await workspace.updateFileContents(deleteTarget.path, 'I have contents!')

			await wait(50) // TODO: Needs a tiny bit of slip here, not sure why. Removal fails the test.
			await fileOp(fs.promises.rm(deleteTarget.path))

			expect(workspace.contentsStore.get(deleteTarget.path)).toBe(deleteTarget)
			expect(deleteTarget.meta.virtual).toBeTruthy()
		})
	})
	
})
