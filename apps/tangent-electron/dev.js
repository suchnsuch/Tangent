const { buildAll } = require('./build')
const electron = require('electron')
const proc = require('child_process')

let watcher = null

async function start() {
	watcher = await buildAll()

	console.log(electron)

	let args = []
	if (process.env.DEBUG) {
		args = ['.', `--inspect-brk=${process.env.DEBUG}`]
	}
	else {
		args = ['.']
	}

	const child = proc.spawn(electron, args, {
		stdio: 'inherit'
	})

	child.on('close', close)
}

function close() {
	if (watcher && watcher.close) {
		watcher.close()
	}
}

start().catch(e => {
	console.error('There was an error running the application')
	console.log(e)

	close()
})
