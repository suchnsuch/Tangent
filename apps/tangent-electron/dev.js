const electronmon = require('electronmon')
const { startDevServer} = require('./build')

let devServer = null
let electronApp = null

async function start() {
	devServer = await startDevServer()

	let args = []
	if (process.env.DEBUG) {
		args = ['.', `--inspect-brk=${process.env.DEBUG}`]
	}
	else {
		args = ['.']
	}

	electronApp = await electronmon({
		args,
		// Only reload for main & preload packages
		// The vite dev server handles the app
		patterns: [
			'!build/**/*',
			'!dist/**/*',
			'!src/**/*',
			'!static/**/*',
			'!test-results/**/*',
			'!tests-integration/**/*',
			'!__build/renderer/**/*'
		],
		env: {
			// Inject the dev server url
			VITE_DEV_SERVER_URL: devServer.url
		}
	})
}

async function close() {
	if (electronApp) {
		const destroying = electronApp.destroy()
		electronApp = null
		await destroying
	}

	if (devServer) {
		try {
			const closing = devServer.close()
			devServer = null
			await closing
		}
		catch(e) {
			console.error('Could not close devServer', devServer)
		}
	}
}

process.on('SIGINT', () => {
	Promise.resolve(close()).finally(() => process.exit(0))
})

start().catch(e => {
	console.error('There was an error running the application')
	console.log(e)

	close()
})
