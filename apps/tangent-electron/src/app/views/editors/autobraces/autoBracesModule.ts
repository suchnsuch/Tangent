import { getEditInfo, rangeIsCollapsed } from 'common/typewriterUtils';
import { Editor, EditorChangeEvent, line, normalizeRange, Source } from 'typewriter-editor';

export type BraceCompletions = {
	[key: string]: string
}

type InsertionPredicate = (position: number, character?: string) => boolean

export interface AutoBracesModulOptions {
	values?: BraceCompletions
	insertionPredicates?: InsertionPredicate[]
}

export default function autoBraces(editor: Editor, options?: AutoBracesModulOptions) {

	let values: BraceCompletions = options?.values ?? {}
	let longestOpener: string = ''
	let longestCloser: string = ''
	let openers: string[] = null
	let closers: string[] = null

	function updateValues(v: BraceCompletions) {
		values = v
		longestOpener = ''
		longestCloser = ''
		openers = Object.keys(v)
		for (const key of openers) {
			if (key.length > longestOpener.length) {
				longestOpener = key
			}
			const value = v[key]
			if (value.length > longestCloser.length) {
				longestCloser = value
			}
		}
		closers = openers.map(o => v[o])
	}
	updateValues(options?.values ?? {})

	let _insertionPredicates: InsertionPredicate[] = options?.insertionPredicates ?? []

	function checkInsertion(position: number, character: string) {
		for (const predicate of _insertionPredicates) {
			if (!predicate(position, character)) {
				return false
			}
		}
		return true
	}

	function getMatchingCharacter(char: string): string {
		return values[char]
	}

	function isClosingCharacter(char: string): boolean {
		for (const key of openers) {
			if (values[key].includes(char)) return true
		}
		return false
	}

	function getBestOpener(text: string): string {
		let best = ''
		for (const key of openers) {
			if (key == text) return key
			if (text.endsWith(key) && key.length > best.length) {
				best = key
			}
		}
		return best
	}
	
	function onKeyDown(event: KeyboardEvent) {
		if (event.defaultPrevented) return
		if (event.ctrlKey || event.metaKey) return
		const doc = editor.doc

		const selection = doc.selection
		if (!selection || !rangeIsCollapsed(selection)) return

		const start = selection[0]

		if (event.code === 'Backspace') {
			const deleteTarget = doc.getText([start - 1, start])
			const pair = getMatchingCharacter(deleteTarget)
			const nextText = doc.getText([start, start + 1])
			if (pair === nextText) {
				// Allow the deletion to resolve, then remove the paired brace
				requestAnimationFrame(() => {
					console.log(editor.doc.getText([start - 1, start]))
					editor.delete([start - 1, start])
				})
				return
			}
		}
		else if (event.key.length === 1) {
			const insert = event.key
			
			const nextText = doc.getText([start, start + longestCloser.length])
			const lastText = doc.getText([start - longestOpener.length, start])

			// Hop over already typed characters
			if (nextText.startsWith(insert) && isClosingCharacter(insert)) {

				const opener = getBestOpener(lastText)
				// Prevent jumping items when still building out a longer opener
				if (!opener || nextText.startsWith(values[opener])) {
					event.preventDefault()
					editor.select(start + 1)
					return
				}
			}

			// Insert matching quotes/braces
			const insertion: string = getMatchingCharacter(insert)
			if (insertion && checkInsertion(start, insertion)) {
				// Allow the current keypress to resolve, then insert the paired brace
				requestAnimationFrame(() => {
					editor.change
						.insert(start + 1, insertion)
						.select(start + 1)
						.apply()
				})
				return
			}
		}

	}

	return {
		init() {
			// editor.on('changing', onChanging)
			editor.root.addEventListener('keydown', onKeyDown)
		},
		destroy() {
			// editor.off('changing', onChanging)
			editor.root.removeEventListener('keydown', onKeyDown)
		},
		updateValues,
		addInsertionPredicate(predicate: InsertionPredicate) {
			_insertionPredicates.push(predicate)
		}
	}
}