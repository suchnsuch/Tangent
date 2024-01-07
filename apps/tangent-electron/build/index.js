const { exec, spawn } = require("child_process");
const fs = require('fs')
const path = require("path")

const webpack = require('webpack')
const AdmZip = require('adm-zip')

const appCompiler = webpack(require('../src/app/webpack.config'))

// TODO: Make this not a copy paste
const mode = process.env.NODE_ENV || 'production';
const prod = mode === 'production';

function buildTypescript() {
	return new Promise((resolve, reject) => {
		console.log('Compiling Typescript...')
		// Checkout [the cli docs](https://www.typescriptlang.org/docs/handbook/compiler-options.html) for more
		exec('npx tsc --project tsconfig.main.json', (err, stdout, stderr) => {
			if (err) {
				console.error('Typescript compilation failed')
				console.error(err.stack || err)
				console.log(stderr)
				console.log(stdout)
				reject(err)
			}
			else {
				resolve()
				console.log('Typescript compiled')
			}
		})
	})
}

async function buildPrism() {
	// I hate how prism wants to be built, so I'm doing it myself
	const buildPath = path.resolve(path.join(__dirname, '../__build', 'bundle', 'prism'))
	try {
		await fs.promises.stat(buildPath)
		console.log('Prism already built')
	}
	catch (e) {
		try {
			await fs.promises.mkdir(buildPath, { recursive: true })
			console.log('Building Prismjs')
			
			const prismNodePath = path.resolve(path.join(__dirname, '../node_modules', 'prismjs'))
			await fs.promises.copyFile(
				path.join(prismNodePath, 'prism.js'),
				path.join(buildPath, 'prism.js'))

			const languageBuildPath = path.join(buildPath, 'languages')
			await fs.promises.mkdir(languageBuildPath, { recursive: true })
			const componentsPath = (path.join(prismNodePath, 'components'))
			let componentFiles = await fs.promises.readdir(componentsPath)

			// Move core prism files
			await Promise.all(componentFiles.map(file => {
				if (file.endsWith('min.js')) {
					return fs.promises.copyFile(
						path.join(componentsPath, file),
						path.join(languageBuildPath, file))	
				}
			}))

			// Svelte support
			const prismSveltePath = path.resolve(path.join(__dirname, '../node_modules', 'prism-svelte', 'index.js'))
			await fs.promises.copyFile(prismSveltePath, path.join(languageBuildPath, 'prism-svelte.min.js')) // The "min" is a lie

			// Move themes
			// TODO: Actually be able to use different themes
			const themeBuildPath = path.join(buildPath, 'themes')
			await fs.promises.mkdir(themeBuildPath, { recursive: true })
			const { themesDirectory } = require('prism-themes')

			let themeFiles = await fs.promises.readdir(themesDirectory)

			await Promise.all(themeFiles.map(async file => {
				if (file.endsWith('.css')) {
					let content = await fs.promises.readFile(path.join(themesDirectory, file), 'utf-8')
					// clean font & font-size so that it's just colors
					content = content.replace(/(font-size|font-family):.*;/g, '')
					await fs.promises.writeFile(path.join(themeBuildPath, file), content, 'utf-8')
				}
			}))
		}
		
		catch (e) {
			console.error('Failed to build Prism', e)
		}
	}
}

async function buildKatex() {
	const fontsPath = path.resolve(path.join(__dirname, '../__build/fonts'))
	try {
		await fs.promises.stat(fontsPath)
		console.log('Fonts already built!')
	}
	catch (e) {
		try {
			// Copy fonts to the build
			const katexFontPath = path.resolve(path.join(__dirname, '../../../node_modules', 'katex', 'dist', 'fonts'))
			await fs.promises.cp(katexFontPath, fontsPath, { recursive: true })
		}
		catch (e) {
			console.error('Failed to build katex fonts', e)
		}
	}

	const stylePath = path.resolve(path.join(__dirname, '../__build/bundle/katex.min.css'))
	try {
		await fs.promises.stat(stylePath)
		console.log('Styles already built!')
	}
	catch (e) {
		try {
			// Copy fonts to the build
			const katexStyle = path.resolve(path.join(__dirname, '../../../node_modules', 'katex', 'dist', 'katex.min.css'))
			await fs.promises.copyFile(katexStyle, stylePath)
		}
		catch (e) {
			console.error('Failed to build katex styles', e)
		}
	}
}

async function buildDocumentation() {
	const buildPath = path.resolve(path.join(__dirname, '../__build', 'documentation.zip'))
	try {
		await fs.promises.stat(buildPath)
		console.log('Documentation already built')
	}
	catch (e) {
		// Create the archive
		let zip = new AdmZip()
		const docPath = path.resolve(path.join(__dirname, '../../../Documentation'))
		zip.addLocalFolder(docPath)
		zip.writeZip(buildPath)
	}
}

function buildMain() {
	console.log('Building Main with Webpack...')
	return new Promise((resolve, reject) => {
		const mainCompiler = webpack(require('../src/main/webpack.config'))
		mainCompiler.run((err, stats) => {
			if (logWebpackErrors(err, stats)) {
				console.error('webpack failed to build')
				reject()
				throw 'Webpack failed to build'
			}
			else {
				resolve()
			}
			mainCompiler.close(closeErr => {
				if (closeErr) {
					console.error('webpack failed to close')
					console.log(closeErr)
				}
			})
		})
	})
	
}

function buildPreload() {
	console.log('Building Preload with Webpack...')
	return new Promise((resolve, reject) => {
		const mainCompiler = webpack(require('../src/preload/webpack.config'))
		mainCompiler.run((err, stats) => {
			if (logWebpackErrors(err, stats)) {
				console.error('webpack failed to build')
				reject()
				throw 'Webpack failed to build'
			}
			else {
				resolve()
			}
			mainCompiler.close(closeErr => {
				if (closeErr) {
					console.error('webpack failed to close')
					console.log(closeErr)
				}
			})
		})
	})
	
}

function buildApp() {
	console.log('Building App with Webpack...')
	return new Promise((resolve, reject) => {
		if (prod || process.env.NO_WATCH === 'true') {
			appCompiler.run((err, stats) => {
				if (logWebpackErrors(err, stats)) {
					console.error('webpack failed to build')
					reject()
					throw 'Webpack failed to build'
				}
				else {
					console.log('Webpack built')
					resolve()
				}

				appCompiler.close(closeErr => {
					if (closeErr) {
						console.error('webpack failed to close')
						console.log(closeErr)
					}
				})
			})
		}
		else {
			let firstBuild = true
			let watcher = appCompiler.watch({
				aggregateTimeout: 500
			}, (err, stats) => {
				if (logWebpackErrors(err, stats)) {
					console.error('webpack failed to build')
					if (firstBuild) {
						reject(err)
						watcher.close(() => {
							console.log('Webpack exited. Restart to try again.')
						})
					}
				}
				else {
					console.log('Webpack built')
					if (firstBuild) {
						resolve(watcher)
					}
				}

				firstBuild = false
			})
		}
	})
}

function logWebpackErrors(err, stats) {
	if (err) {
		console.error(err.stack || err);
		if (err.details) {
			console.error(err.details);
		}
		return 2;
	}
	
	const info = stats.toJson();
	
	let result = 0
	if (stats.hasErrors()) {
		console.log(info.errors.length, 'Errors')
		for (let err of info.errors) {
			console.log(err.moduleName, err.loc)
			console.log(err.message)
		}
		result = 1
	}
	
	if (stats.hasWarnings()) {
		console.log(info.warnings.length, 'Warnings')
		for (let warning of info.warnings) {
			console.log(warning.moduleName, warning.loc)
			console.log(warning.message)
			if (warning.stack) {
				//console.log(warning.stack)
			}
		}
		result = -1
	}
	return result
}

async function buildAll() {
	await buildMain()
	await buildPreload()

	await buildKatex()
	await buildPrism()
	await buildDocumentation()

	let watcher = await buildApp()

	if (watcher) {
		return watcher
	}
}

module.exports = {
	buildTypescript,
	buildApp,
	buildAll
}

if (require.main === module) {

	const yargs = require('yargs')
	const argv = yargs
		.option('typescript', {
			alias: 't',
			description: 'Build Typescript',
			type: 'boolean'
		}).argv

	let willBuildAll = true
	if (argv.typescript) {
		willBuildAll = false
		buildTypescript().catch(console.log)
	}

	if (willBuildAll) {
		buildAll()
	}
}
