import fs from 'fs'
import path from 'path'
import { ipcMain } from 'electron'
import Logger from 'js-logger'

const log = Logger.get('themes')

const codeThemeExtension = '.tangentcodetheme'

const themesPath = path.join(__dirname, '../../static/themes')

ipcMain.handle('getCodeThemes', async (event, value) => {
	// TODO: Support custom themes
	const data = await fs.promises.readdir(themesPath)

	const result: string[] = []

	for (const item of data) {
		if (item.endsWith(codeThemeExtension)) {
			result.push(item.substring(0, item.length - codeThemeExtension.length))
		}
	}

	return result
})

ipcMain.handle('getCodeTheme', async (event, name) => {
	try {
		const themePath = path.join(themesPath, name + codeThemeExtension)
		const content = await fs.promises.readFile(themePath, 'utf8')

		const result = {
			block: null,
			tokens: null
		}

		const blockStart = content.indexOf('<style id="block">')
		if (blockStart >= 0) {
			const close = content.indexOf('</style>', blockStart)
			if (close >= 0) {
				result.block = content.substring(blockStart + 18, close)
			}
		}
		
		const tokensStart = content.indexOf('<style id="tokens">')
		if (tokensStart >= 0) {
			const close = content.indexOf('</style>', tokensStart)
			if (close >= 0) {
				result.tokens = content.substring(tokensStart + 19, close)
			}
		}

		if (!result.block) {
			log.warn(`Could not find a valid "block" style for theme "${name}".`)
		}

		if (!result.tokens) {
			log.warn(`Could not find a valid "tokens" style for theme "${name}".`)
		}

		return result
	}
	catch (error) {
		log.error(`Could not find a theme named "${name}":`, error)
	}
})
