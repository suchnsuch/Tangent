import type { ElectronApplication } from '@playwright/test'
import TangentWindow from './TangentWindow'

export default class TangentApp {

	app: ElectronApplication
	workspacePath: string

	constructor(app: ElectronApplication, workspace: string) {
		this.app = app
		this.workspacePath = workspace
	}

	async firstWindow(waitForReady=true) {
		const window = await this.app.firstWindow()
		const tangentWindow = new TangentWindow(this, window)

		if (waitForReady) {
			await tangentWindow.waitForReady()
		}

		return tangentWindow
	}

	close() {
		return this.app.close()
	}
}