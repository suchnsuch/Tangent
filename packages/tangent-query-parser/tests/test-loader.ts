import fs from 'fs'
import path from 'path'
import { Registry, parseRawGrammar, INITIAL } from 'vscode-textmate'
import { loadWASM, createOnigScanner, createOnigString } from 'vscode-oniguruma'
import { installTextmate, parseQueryText } from '../src/parser'

function getNodePath(partial: string) {
	return path.resolve(__dirname, '../../../node_modules', partial)
}

async function loadVSCodeOnigurumaLib() {
	const wasmPath = getNodePath('vscode-oniguruma/release/onig.wasm')
	const wasmBin = (await fs.promises.readFile(wasmPath)).buffer

	await loadWASM(wasmBin)

	return {
		createOnigScanner,
		createOnigString
	}
}

const onigLib = loadVSCodeOnigurumaLib()

const registry = new Registry({
	onigLib,
	async loadGrammar(scopeName: string) {
		if (scopeName === 'source.tangentquery') {
			const grammarPath = path.resolve(__dirname, '../syntaxes/tangentquery.tmLanguage.json')
			const file = await fs.promises.readFile(
				grammarPath,
				'utf8'
			)
			return parseRawGrammar(file, grammarPath)
		}
		return null;
	}
})

export { registry }

export async function install() {
	await installTextmate({ registry, initialStack: INITIAL })
}
