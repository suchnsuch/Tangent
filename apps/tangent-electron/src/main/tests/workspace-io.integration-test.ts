import path from 'path'
import fs from 'fs'
import Workspace from 'main/Workspace'
import { wait } from '@such-n-such/core'
import Session from 'common/dataTypes/Session'

describe('IO', () => {
	let workspace: Workspace = null
	let newPaths: string[] = []

	beforeAll(async () => {
		const workspacePath = path.resolve(path.join(__dirname, '../../../../TestFiles/TestWorkspace'))
		//await fs.promises.mkdir(workspacePath)
		workspace = await Workspace.loadWorkspace(workspacePath)
	})

	async function fileOp(filePromise: Promise<unknown>) {
		await filePromise
		// This number is a total hack. If shit breaks and you don't know why,
		// try making this number go up. Naturally, you want it to be as low
		// as possible, otherwise the tests will take longer.
		await wait(160)
		await workspace.watcherIdleHandle()
	}

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
		//await fs.promises.rm(workspace.rootPath, { recursive: true, force: true })
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

	describe('Nested file creation', () => {
		test('Can create nested folders', async () => {
			const basePath = path.join(workspace.rootPath, 'a long')
			const folderPath = path.join(basePath, 'nested', 'folder')
			newPaths.push(basePath)

			const node = await workspace.ensureFolderExists(null, folderPath)
			const stat = await fs.promises.stat(folderPath)
			expect(stat.isDirectory()).toBeTruthy()
		})

		test('Can create files in nested folders', async () => {
			const basePath = path.join(workspace.rootPath, 'a crazy')
			const filePath = path.join(basePath, 'deep', 'directory', 'file.md')
			newPaths.push(basePath)

			const node = workspace.createFile(null, filePath)
			await workspace.watcherIdleHandle()
			const stat = await fs.promises.stat(filePath)
			expect(stat.isFile()).toBeTruthy()
			expect(await fs.promises.readFile(filePath, 'utf8')).toEqual('')
		})
	})

	describe('Session IO Coherency', () => {
		test('Sessions with undefined currentNodes in thread history round trip through serialization', () => {
			const session = new Session({ store: workspace.contentsStore, json: '', file: null })

			session.addThreadHistory({
				thread: [
					getAndCheckFile('TestFile'),
					getAndCheckFile('Test File The Second')
				],
				currentNode: undefined
			})

			const raw = session.getRawValues('file')

			const string = JSON.stringify(raw, null, '\t')
			const newRaw = JSON.parse(string)

			expect(session.applyPatch(newRaw)).toBe(false)
		})

		test('Sessions with undefined currentNodes in an empty thread history item round trip through serialization', () => {
			const session = new Session({ store: workspace.contentsStore, json: '', file: null })

			session.addThreadHistory({
				thread: [],
				currentNode: undefined
			})

			const raw = session.getRawValues('file')

			const string = JSON.stringify(raw, null, '\t')
			const newRaw = JSON.parse(string)

			expect(session.applyPatch(newRaw)).toBe(false)
		})
	})
})
