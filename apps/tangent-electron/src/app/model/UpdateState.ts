import type { UpdateAPI } from "common/WindowApi";
import { WritableStore } from 'common/stores'
import type { ProgressInfo, UpdateInfo } from "electron-updater";

type UpdateMode = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error'

export default class UpdateState {

	private api: UpdateAPI

	mode: WritableStore<UpdateMode> = new WritableStore('idle')
	lastChecked: WritableStore<Date> = new WritableStore(null)

	nextUpdate: WritableStore<UpdateInfo> = new WritableStore(null)
	downloadProgress: WritableStore<ProgressInfo> = new WritableStore(null)
	errorMessage: WritableStore<string> = new WritableStore(null)

	constructor(api: UpdateAPI) {
		this.api = api
		api.onChecking(() => {
			this.nextUpdate.set(null)
			this.downloadProgress.set(null)
			this.mode.set('checking')
			this.lastChecked.set(new Date())
		})
		api.onAvailable(info => {
			this.nextUpdate.set(info)
			this.mode.set('available')
			this.lastChecked.set(new Date())
		})
		api.onNotAvailable(() => {
			this.nextUpdate.set(null)
			this.downloadProgress.set(null)
			this.mode.set('up-to-date')
			this.lastChecked.set(new Date())
		})
		api.onProgress(progress => {
			this.mode.set('downloading')
			this.downloadProgress.set(progress)
		})
		api.onReady(info => {
			this.mode.set('ready')
			this.nextUpdate.set(info)
			this.downloadProgress.set(null)
			this.lastChecked.set(new Date())
		})
		api.onError((message, stack) => {
			this.mode.set('error')
			this.downloadProgress.set(null)

			console.error('Update experienced an error:', message, stack)
			this.errorMessage.set(message)
		})
	}

	checkForUpdate() {
		this.api.checkForUpdate()
	}

	updateNow() {
		this.api.update()
	}
}
