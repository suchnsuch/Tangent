import fs from 'fs'
import { Registry, parseRawGrammar } from 'vscode-textmate'
import { loadWASM, createOnigScanner, createOnigString } from 'vscode-oniguruma'
import { parseQueryText } from '../src'

async function loadVSCodeOnigurumaLib() {
	const wasmPath = './node_modules/vscode-oniguruma/release/onig.wasm'
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
			const grammarPath = './syntaxes/tangentquery.tmLanguage.json'
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

export async function getTQGrammar() {
	return registry.loadGrammar('source.tangentquery')
}

export async function parse(text: string) {
	return parseQueryText(text, await getTQGrammar())
}
