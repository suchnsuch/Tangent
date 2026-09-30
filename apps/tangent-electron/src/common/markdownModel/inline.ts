import type NoteParser from './NoteParser'

export function getInlineId(parser: NoteParser, start: number, end: number) {
	return `${start - parser.lineStart}-${end - parser.lineStart}`
}
