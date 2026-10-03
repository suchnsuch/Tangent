/**
 * So basically, I hate how Prism is packaged, but it's still the best
 * option I was able to locate. So I'm doing stuff myself.
 */
import Prism from 'prismjs'
import config from 'prismjs/components'
import type { TokenStream } from 'prismjs'
import { Op } from '@typewriter/delta'

import type LinesBuilder from './LinesBuilder'

const languageAliasLookup = new Map<string, string>()
const loadedLanguages = new Set<string>()

let loadLanguageDefinition: (name: string) => Promise<unknown> = null

/**
 * Allows definitions for other languages to be provided via external means.
 */
export function setLanguageLoader(languageLoader: (name: string) => Promise<unknown>) {
	loadLanguageDefinition = languageLoader
}

for (const key of Object.keys(Prism.languages)) {
	loadedLanguages.add(key)
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
	const grammar = Prism.languages[language]
	if (grammar) {
		return Prism.tokenize(code, grammar)
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
	const language = languageAliasLookup.get(format)
	if (!language) return

	// Ask prism directly rather than trusting `loadedLanguages`: definitions can
	// also arrive by being imported outright, without going through the loader
	if (Prism.languages[language]) return language

	// If an attempt has been made or there is no loader, give up
	if (loadedLanguages.has(language) || !loadLanguageDefinition) return null

	const languagesToLoad = [language]
	const languagesToCheck = [language]

	// Check for the language dependencies, and their dependences, etc
	while (languagesToCheck.length > 0) {
		// First in first out so that dependencies are found in order of depth
		const languageToCheck = languagesToCheck.shift()

		if (!loadedLanguages.has(languageToCheck))
		{
			const languageData = config.languages[languageToCheck]
			const dependencies = languageData?.require
			if (dependencies) {
				if (typeof dependencies === 'string') {
					languagesToLoad.push(dependencies)
					languagesToCheck.push(dependencies)
				}
				else if (Array.isArray(dependencies)) {
					for (const dependency of dependencies) {
						languagesToLoad.push(dependency)
						languagesToCheck.push(dependency)
					}
				}
			}
		}
	}

	// Last in first out so that dependencies are loaded before what needs them
	async function loadAll() {
		while (languagesToLoad.length > 0) {
			const languageToLoad = languagesToLoad.pop()
			if (loadedLanguages.has(languageToLoad)) continue

			try {
				await loadLanguageDefinition(languageToLoad)
				loadedLanguages.add(languageToLoad)
			}
			catch (err) {
				console.error('Could not load the prism definition for', languageToLoad, err)
				// Give up on this language rather than retrying forever
				loadedLanguages.add(languageToLoad)
			}
		}
	}

	loadAll()

	return 'Loading'
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

export function tokensToOps(tokens: TokenStream, type: string = null, ops: Op[] = null): Op[] {
	if (!ops) ops = []

	if (typeof tokens === 'string') {
		while (tokens) {
			let end = tokens.indexOf('\n')
			if (end < 0) end = tokens.length

			if (end > 0) {
				const op: Op = {
					insert: tokens.substring(0, end)
				}

				if (type) {
					op.attributes = {
						code_syntax: type
					}
				}

				ops.push(op)
			}
			
			if (tokens.length > end) {
				// Inject newline
				ops.push({ insert: '\n' })
				tokens = tokens.substring(end + 1)
			}
			else {
				break
			}
		}
	}
	else if (Array.isArray(tokens)) {
		for (const token of tokens) {
			tokensToOps(token, type, ops)
		}
	}
	else {
		tokensToOps(tokens.content, tokens.type, ops)
	}

	return ops
}
