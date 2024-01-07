import os from 'os'
import Logger from 'js-logger'
import { subscribeToSettings } from './settings'
import { app, crashReporter } from 'electron'

const log = Logger.get('debugging')

let crashReportUnsub: any = null

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

	subscribeToSettings(settings => {
		if (crashReportUnsub) crashReportUnsub()

		crashReportUnsub = settings.debug_sendCrashReports.subscribe(send => {
			log.info('Upload crashes to server:', send)
			crashReporter.setUploadToServer(send)
		})
	})
	
}
