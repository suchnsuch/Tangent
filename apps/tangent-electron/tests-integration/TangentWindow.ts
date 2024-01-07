import fs from 'fs'
import path from 'path'
import type { Page } from 'playwright'

import { shortcut } from './keyboard'
import type TangentApp from './TangentApp'

import type { Workspace } from '../src/app/model'
import type NoteFile from '../src/app/model/NoteFile'
import type { FocusLevel } from 'common/dataTypes/TangentInfo'
import { wait } from './tangent'

export default class TangentWindow {

	app: TangentApp
	page: Page

	constructor(app: TangentApp, page: Page) {
		this.app = app
		this.page = page
	}

	get keyboard() { return this.page.keyboard }
	shortcut(combo: string) {
		return shortcut(this.keyboard, combo)
	}

	async waitForReady() {
		await this.page.waitForLoadState('networkidle')
		await this.page.waitForSelector('main.WorkspaceView')
	}

	locateCurrentNoteTitle() {
		return this.page.locator('.current .noteEditor header .title')
	}

	locateCurrentNoteBody() {
		return this.page.locator('.current .noteEditor article')
	}

	getCurrentEditorText() {
		return this.page.evaluate(() => {
			const workspace = (document as any).workspace as Workspace
			const tangent = workspace.viewState.tangent
			const file = tangent.currentNode.value as NoteFile
			if (file && file.getFileContent)
				return file.getFileContent()
			return null
		})
	}

	setCurrentEditorText(text: string) {
		return this.page.evaluate(([text]) => {
			const workspace = (document as any).workspace as Workspace
			const tangent = workspace.viewState.tangent
			const file = tangent.currentNode.value as NoteFile
			if (file && file.getFileContent)
				file.setFileContent(text)
		}, [text])
	}

	getCurrentFilePath() {
		return this.page.evaluate(() => {
			const workspace = (document as any).workspace as Workspace
			const tangent = workspace.viewState.tangent
			const file = tangent.currentNode.value
			return file?.path
		})
	}

	async getCurrentFileText() {
		const filePath = await this.getCurrentFilePath()
		if (filePath) {
			try {
				return fs.promises.readFile(filePath, 'utf8')
			}
			catch {}
		}
		return null
	}

	createAndOpenFileNamed(name: string) {
		return this.page.evaluate(() => {
			const workspace = (document as any).workspace as Workspace
			workspace.navigateTo({
				link: {
					href: name,
					form: 'wiki'
				}
			})
		})
	}

	getCurrentSessionPath() {
		return this.page.evaluate(() => {
			const workspace = (document as any).workspace as Workspace
			return workspace.viewState.tangent.tangentInfo.value?.activeSession.value?.path
		})
	}

	async getCurrentRawSession(withSafetyMargin=500) {
		const sessionPath = await this.getCurrentSessionPath()
		if (withSafetyMargin) await wait(withSafetyMargin)

		const sessionText = await fs.promises.readFile(sessionPath, 'utf8')
		return JSON.parse(sessionText)
	}

	getCurrentRawClientSession() {
		return this.page.evaluate(() => {
			const workspace = (document as any).workspace as Workspace

			const session = workspace.viewState.tangent.activeSession.value
			if (session) {
				return session.getRawValues('file')
			}
		})	
	}

	getPerfTime() {
		return this.page.evaluate(() => {
			return window.performance.now()
		})
	}

	setSize(options: { width: number, height: number}) {
		return this.page.evaluate(([options]) => {
			const workspace = (document as any).workspace as Workspace
			workspace.api.window.setSize(options)
		}, [options])
	}

	setFocusLevel(level: FocusLevel) {
		return this.page.evaluate(({ level }) => {
			const workspace = (document as any).workspace as Workspace
			workspace.viewState.tangent.focusLevel.set(level)
		}, { level })
	}

	setThread(options: { paths: string[], current?: string, root?: string }) {

		let { paths, current, root } = options

		root = root ? path.join(this.app.workspacePath, root) : this.app.workspacePath

		paths = paths.map(p => path.join(root, p))
		current = current ? path.join(root, current) : paths.at(-1)

		return this.page.evaluate(({ paths, current }) => {
			const workspace = (document as any).workspace as Workspace
			const thread = []

			for (const p of paths) {
				const node = workspace.directoryStore.get(p)
				if (node) {
					thread.push(node)
				}
			}

			workspace.viewState.tangent.updateThread({
				thread,
				currentNode: workspace.directoryStore.get(current)
			})
		}, { paths, current })
	}

	setCurrentNode(current: string) {
		current = path.join(this.app.workspacePath, current)

		return this.page.evaluate(([current]) => {
			const workspace = (document as any).workspace as Workspace
			
			workspace.viewState.tangent.updateThread({
				thread: 'retain',
				currentNode: workspace.directoryStore.get(current)
			})
		}, [current])
	}

	addConnections(options: {
		connections: { from: string, to: string, strength: number }[],
		root?: string
	}) {
		let { connections, root } = options

		root = root ? path.join(this.app.workspacePath, root) : this.app.workspacePath

		for (const connection of connections) {
			connection.from = path.join(root, connection.from)
			connection.to = path.join(root, connection.to)
		}

		return this.page.evaluate(({ connections }) => {
			const workspace = (document as any).workspace as Workspace
			
			const map = workspace.viewState.tangent.activeSession.value.map
			for (const { from, to, strength } of connections) {
				map.connect({ from, to, strength })
			}
		}, { connections })
	}
}
