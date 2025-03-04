import Logger from 'js-logger'
import { getSettings } from './settings'
import { app, crashReporter } from 'electron'

const log = Logger.get('debugging')

export async function initializeDebugging() {
	log.info('Starting crash reporter')
	crashReporter.start({
		submitURL: 'https://tangent.bugsplat.com/post/electron/crash.php',
		uploadToServer: true, // Override with settings later
		compress: true,
		ignoreSystemCrashHandler: false,
		rateLimit: false,
		globalExtra: {
			key: 'Tangent_' + app.getVersion()
		}
	})

	getSettings().debug_sendCrashReports.subscribe(send => {
		log.info('Upload crashes to server:', send)
		crashReporter.setUploadToServer(send)
	})
}
