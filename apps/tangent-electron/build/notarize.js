const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const { notarize } = require('@electron/notarize')

const config = require('../electron-builder.json')

exports.default = async function notarizeTheApp(context) {

	if (context.electronPlatformName !== 'darwin') {
		return
	}

	const publishIndex = process.argv.indexOf('--publish')
	if (publishIndex >= 0 && process.env.NOTARIZE !== 'force') {
		if (process.argv[publishIndex + 1] === 'never') {
			return
		}
	}

	const appName = context.packager.appInfo.productFilename

	let notarizeConfig = {
		tool: 'notarytool',
		appBundleId: config.appId,
		appPath: `${context.appOutDir}/${appName}.app`,
		appleId: process.env.APPLE_ID,
		teamId: process.env.APPLE_TEAM_ID,
		appleIdPassword: process.env.APPLE_ID_PASSWORD
	}

	console.log('notarizing...')

	let start = new Date()

	await notarize(notarizeConfig)

	let end = new Date()

	console.log('Notarized in ' + ((end - start) / 1000) + ' seconds')
}