import { ipcMain } from 'electron'
import Logger from 'js-logger'

const log = Logger.get('dictionary')

ipcMain.handle('dictionary', async (event, type, payload) => {
	try {
		switch (type) {
			case 'getAllWords':
				return event.sender.session.listWordsInSpellCheckerDictionary()
			case 'remove':
				return event.sender.session.removeWordFromSpellCheckerDictionary(payload)
		}
	}
	catch (err) {
		log.error(`Failed to parse dictionary message: ${type}, ${payload}`)
	}
})
