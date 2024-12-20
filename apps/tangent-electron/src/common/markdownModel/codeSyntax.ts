/**
 * So basically, I hate how Prism is packaged, but it's still the best
 * option I was able to locate. So I'm doing stuff myself.
 */
import config from 'prismjs/components'
import type { TokenStream } from 'prismjs'
import { wait } from '@such-n-such/core'

import type LinesBuilder from './LinesBuilder'

let DomPrism = typeof window !== 'undefined' ? (window as any).Prism : null

const languageAliasLookup = new Map<string, string>()
const loadedLanguages = new Set<string>()

if (DomPrism) {
	for (const key of Object.keys(DomPrism.languages)) {
		loadedLanguages.add(key)
	}
}

// Add core prism languages
for (const name of Object.keys(config.languages)) {
	if (name === 'meta') continue
	const language = config.languages[name]
	languageAliasLookup.set(name, name)

	const alias = language.alias
	if (Array.isArray(alias)) {
		for (const a of alias) {
			languageAliasLookup.set(a, name)
		}
	}
	else if (typeof alias === 'string') {
		languageAliasLookup.set(alias, name)
	}
}

// Add supplementary languages
['svelte'].forEach(lang => {
	languageAliasLookup.set(lang, lang)
})

export function tokenize(code: string, language: string): TokenStream {
	if (DomPrism) {
		const grammar = DomPrism.languages[language]
		if (grammar) {
			return DomPrism.tokenize(code, grammar)
		}
	}
	else {
		const prismjs = require('prismjs')
		const grammar = prismjs.languages[language]
		if (grammar) {
			return prismjs.tokenize(code, grammar)
		}
	}
	return null
}

export function getLanguageAliases() {
	return languageAliasLookup
}

/**
 * Confirms a language and potentially triggers the load of a new language definition and any of its dependencies.
 * @param format The source text to check
 * @returns The de-aliased language, "Loading" if a language needed to load, or null if the language was not found
 */
export function getLanguage(format: string) {
	let language = languageAliasLookup.get(format)
	if (!language) return
	if (DomPrism) {
		if (!loadedLanguages.has(language)) {

			const languagesToLoad = [language]
			const languagesToCheck = [language]

			// Check for the language dependencies, and their dependences, etc
			while (languagesToCheck.length > 0) {
				// First in first out so that dependencies are found in order of depth
				const languageToCheck = languagesToCheck.shift()

				if (!loadedLanguages.has(languageToCheck))
				{
					const languageData = config.languages[languageToCheck]
					const require = languageData?.require
					if (require) {
						if (typeof require === 'string') {
							languagesToLoad.push(require)
							languagesToCheck.push(require)
						}
						else if (Array.isArray(require)) {
							for (const r of require) {
								languagesToLoad.push(r)
								languagesToLoad.push(r)
							}
						}
					}
				}
			}

			console.log('For', language, 'loading', languagesToLoad.slice())

			// Last in first out so that dependencies are loaded in reverse order

			async function loadAll() {
				while (languagesToLoad.length > 0) {
					const languageToLoad = languagesToLoad.pop()
					const script = document.createElement('script')
					script.src = `../__build/bundle/prism/languages/prism-${languageToLoad}.min.js`
					document.head.appendChild(script)
					loadedLanguages.add(languageToLoad)

					// Delay these so that they actually happen one at a time
					if (languagesToLoad.length) await wait()
				}
			}

			loadAll()

			return 'Loading'
		}
		if (DomPrism.languages[language]) {
			return language
		}
	}
	else if (DomPrism === null) { // Explictly check for null so that misconfigured browser environments just fail
		if (format in require('prismjs').languages) {
			return format
		}
	}
	return null
}

export function parseTokens(tokens: TokenStream, builder: LinesBuilder) {
	if (typeof tokens === 'string') {
		
		let newLine = tokens.indexOf('\n')

		while (newLine >= 0) {
			builder.addSpan(tokens.substring(0, newLine))
			builder.buildLine()
			tokens = tokens.substring(newLine + 1)
			newLine = tokens.indexOf('\n')
		}

		builder.addSpan(tokens)
		return
	}
	if (Array.isArray(tokens)) {
		for (const token of tokens) {
			parseTokens(token, builder)
		}
		return
	}
	// Token
	builder.addOpenFormat('code_syntax', {
		'code_syntax': tokens.type
	})
	parseTokens(tokens.content, builder)
	builder.dropOpenFormat('code_syntax')
}
