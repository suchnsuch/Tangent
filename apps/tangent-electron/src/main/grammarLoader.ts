import fs from 'fs'
import path from 'path'
import { Registry, parseRawGrammar, IOnigLib } from 'vscode-textmate'
import { loadWASM, createOnigScanner, createOnigString } from 'vscode-oniguruma'

import Logger from 'js-logger'
const log = Logger.get('grammar-loader')

async function getNodePath(partial: string) {
	try {
		const truePath = path.resolve(__dirname, '../../node_modules', partial) 
		// Confirm it exists:
		const stat = await fs.promises.stat(truePath)
		return truePath
	}
	catch (e) {
		log.warn('Falling back to root node modules for:', partial)
		return path.resolve(__dirname, '../../../../node_modules', partial)
	}
}

async function loadVSCodeOnigurumaLib() {
	try {
		const wasmPath = await getNodePath('vscode-oniguruma/release/onig.wasm')
		log.info('Loading onigurama wasm from: ' + wasmPath)
		const wasmBin = (await fs.promises.readFile(wasmPath)).buffer
		log.info('    onigurama bin read from disk...')
		await loadWASM(wasmBin)
		log.info('    onigurama initialized')
	}
	catch (err) {
		log.error('Oniguruma library failed to load')
		log.info(err)
	}
	
	return {
		createOnigScanner,
		createOnigString
	}
}

// Lazy init so that order of loading can be better controlled
let onigLib: Promise<IOnigLib> = null
let registry: Registry = null

function getOnigurumaLib() {
	if (!onigLib) {
		onigLib = loadVSCodeOnigurumaLib()
	}
	return onigLib
}

export function getRegistry() {
	if (!registry) {
		registry = new Registry({
			onigLib: getOnigurumaLib(),
			async loadGrammar(scopeName: string) {
				if (scopeName === 'source.tangentquery') {
					const grammarPath = await getNodePath('@such-n-such/tangent-query-parser/syntaxes/tangentquery.tmLanguage.json')
					try {
						log.info('Loading source.tangentquery grammar from: ' + grammarPath)
						const file = await fs.promises.readFile(
							grammarPath,
							'utf8'
						)
						return parseRawGrammar(file, grammarPath)
					}
					catch (err) {
						log.error(err)
						throw new Error('Failed to load grammar from: ' + grammarPath)
					}
				}
				return null;
			}
		})
	}
	return registry
}
