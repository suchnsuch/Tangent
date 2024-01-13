import { parseQueryText } from '@such-n-such/tangent-query-parser';
import { ipcMain } from 'electron';
import Logger from 'js-logger';
import { getWindowHandle } from 'main/workspaces';

const log = Logger.get('queries')

ipcMain.handle('query', async (event, type, payload) => {
	let windowHandle = getWindowHandle(event.sender)
	if (windowHandle && windowHandle.workspace) {
		try {
			switch (type) {
				case 'results':
					const start = performance.now()
					const result = await windowHandle.workspace.indexer.solveQuery(payload)
					const end = performance.now()
					log.info(`Queried results of {${payload}} in ${end - start}ms`)
					return result
				case 'parse':
					return parseQueryText(payload)
			}
		}
		catch (err) {
			log.error(`Failed to parse query {${payload}}.\n`, err)
			if (err instanceof Error) {
				log.info(err.stack)
			}
		}
	}
	return null
})