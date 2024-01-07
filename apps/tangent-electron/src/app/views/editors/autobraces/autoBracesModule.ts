import { getEditInfo } from 'common/typewriterUtils';
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

	function onChanging(event: EditorChangeEvent) {
		const doc = event.doc

		if (event.source === Source.api || event.source === Source.history) return

		if (event.change && event.changedLines?.length) {
			const info = getEditInfo(event.change.delta)
			const insert = info?.insert
			if (insert && insert.length === 1) {
				const start = info.offset + 1
				const nextText = doc.getText([start, start + longestCloser.length])
				const lastText = doc.getText([start - longestOpener.length, start])

				// Hop over already typed characters
				if (nextText.startsWith(insert) && isClosingCharacter(insert)) {

					const opener = getBestOpener(lastText)
					// Prevent jumping items when still building out a longer opener
					if (!opener || nextText.startsWith(values[opener])) {
						event.preventDefault()
						editor.select(start)
						return
					}
				}

				// Insert matching quotes/braces
				const insertion: string = getMatchingCharacter(insert)
				if (insertion && checkInsertion(start, insertion)) {
					const change = doc.change.insert(start, insertion)
					event.modify(change.delta)
					requestAnimationFrame(() => editor.select(start))
					return
				}
			}
			else if (info?.shift === -1) {
				// Delete occuring, check to remove matching characters
				const start = normalizeRange(doc.selection)[0]
				const oldText = event.old.getText([start, start + 1])
				const pair = getMatchingCharacter(oldText)
				const nextText = doc.getText([start, start + 1])
				if (pair === nextText) {
					const change = doc.change.delete([start, start + 1])
					event.modify(change.delta)
					return
				}
			}
		}
	}

	return {
		init() {
			editor.on('changing', onChanging)
		},
		destroy() {
			editor.off('changing', onChanging)
		},
		updateValues,
		addInsertionPredicate(predicate: InsertionPredicate) {
			_insertionPredicates.push(predicate)
		}
	}
}