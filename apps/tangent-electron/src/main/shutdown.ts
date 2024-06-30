import Logger from 'js-logger'
import { saveSettings } from './settings'
import { saveAndCloseWorkspaces } from './workspaces'
import { app } from 'electron'

const log = Logger.get('shutdown')

const shutdownTasks: Promise<any>[] = []

let shutDownState: 'idle' | 'shutting down' | 'done' = 'idle'
let shutDownProcess: Promise<void> = null

export function addShutDownTask(task: Promise<any>) {
	shutdownTasks.push(task)
}

export function isReadyToShutDown() {
	return shutDownState === 'done'
}

async function processShutDown() {
	while (shutdownTasks.length) {
		try {
			await Promise.all(shutdownTasks.splice(0, shutdownTasks.length))
		}
		catch (err) {
			log.error('Error When Shutting Down')
			log.error(err)
			break
		}
	}
	log.info('Shut Down Complete')
	shutDownState = 'done'
	app.quit()
}

export function shutDown() {
	if (shutDownState !== 'idle') return

	shutDownState = 'shutting down'
	log.info('Shutting Down Tangent')
	addShutDownTask(saveSettings())
	addShutDownTask(saveAndCloseWorkspaces())

	shutDownProcess = processShutDown()
}
